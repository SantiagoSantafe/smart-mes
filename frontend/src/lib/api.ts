const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mes_token");
}

export function logout() {
  localStorage.removeItem("mes_token");
  document.cookie = "mes_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
  window.location.href = "/login";
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    logout();
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error en la solicitud");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    req<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Dashboard
  dashboard: () => req<DashboardData>("/api/projects/dashboard"),

  // Projects
  listProjects: (state?: string) =>
    req<ProjectListItem[]>(`/api/projects${state ? `?state=${state}` : ""}`),
  getProject: (id: number) => req<Project>(`/api/projects/${id}`),
  createProject: (body: object) =>
    req<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id: number, body: object) =>
    req<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  transitionProject: (id: number, target_state: string, reason?: string) =>
    req<Project>(`/api/projects/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ target_state, reason }),
    }),
  allowedTransitions: (id: number) =>
    req<{ state: string; label: string }[]>(`/api/projects/${id}/allowed-transitions`),

  // Material Plan
  getPlan: (projectId: number) =>
    req<MaterialPlan>(`/api/projects/${projectId}/plan`),
  createPlan: (projectId: number, notes?: string) =>
    req<MaterialPlan>(`/api/projects/${projectId}/plan`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  addPlanLine: (projectId: number, body: object) =>
    req<MaterialPlanLine>(`/api/projects/${projectId}/plan/lines`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePlanLine: (projectId: number, lineId: number, body: object) =>
    req<MaterialPlanLine>(`/api/projects/${projectId}/plan/lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePlanLine: (projectId: number, lineId: number) =>
    req<void>(`/api/projects/${projectId}/plan/lines/${lineId}`, { method: "DELETE" }),

  // Work Areas
  listAreas: () => req<WorkArea[]>("/api/areas"),
  createArea: (body: object) =>
    req<WorkArea>("/api/areas", { method: "POST", body: JSON.stringify(body) }),
  updateArea: (id: number, body: object) =>
    req<WorkArea>(`/api/areas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  listRoutes: () => req<ProcessRoute[]>("/api/areas/routes"),
  createRoute: (body: object) =>
    req<ProcessRoute>("/api/areas/routes", { method: "POST", body: JSON.stringify(body) }),
  addRouteStep: (routeId: number, body: object) =>
    req<RouteStep>(`/api/areas/routes/${routeId}/steps`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteRouteStep: (routeId: number, stepId: number) =>
    req<void>(`/api/areas/routes/${routeId}/steps/${stepId}`, { method: "DELETE" }),

  // FCS
  scheduleProject: (projectId: number) =>
    req<FCSSlot[]>(`/api/fcs/schedule/${projectId}`, { method: "POST" }),
  ganttData: () => req<GanttTask[]>("/api/fcs/gantt"),
  updateSlot: (slotId: number, body: object) =>
    req<FCSSlot>(`/api/fcs/slots/${slotId}`, { method: "PATCH", body: JSON.stringify(body) }),
  bottlenecks: () => req<Bottleneck[]>("/api/fcs/bottlenecks"),

  // Purchasing — Materials
  listMaterials: (lowStock?: boolean) =>
    req<Material[]>(`/api/purchasing/materials${lowStock ? "?low_stock=true" : ""}`),
  createMaterial: (body: object) =>
    req<Material>("/api/purchasing/materials", { method: "POST", body: JSON.stringify(body) }),
  updateInventory: (materialId: number, body: object) =>
    req<InventoryRecord>(`/api/purchasing/materials/${materialId}/inventory`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // Purchasing — Suppliers
  listSuppliers: () => req<Supplier[]>("/api/purchasing/suppliers"),
  createSupplier: (body: object) =>
    req<Supplier>("/api/purchasing/suppliers", { method: "POST", body: JSON.stringify(body) }),

  // Purchasing — Requests
  listRequests: (projectId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", String(projectId));
    if (status) params.set("status", status);
    const qs = params.toString();
    return req<PurchaseRequest[]>(`/api/purchasing/requests${qs ? `?${qs}` : ""}`);
  },
  createRequest: (body: object) =>
    req<PurchaseRequest>("/api/purchasing/requests", { method: "POST", body: JSON.stringify(body) }),

  // Purchasing — Purchase Orders
  listPurchaseOrders: (projectId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", String(projectId));
    if (status) params.set("status", status);
    const qs = params.toString();
    return req<PurchaseOrder[]>(`/api/purchasing/orders${qs ? `?${qs}` : ""}`);
  },
  createPurchaseOrder: (body: object) =>
    req<PurchaseOrder>("/api/purchasing/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrderStatus: (poId: number, status: string) =>
    req<void>(`/api/purchasing/orders/${poId}/status?status=${status}`, { method: "PATCH" }),
  receiveLine: (poId: number, lineId: number, body: object) =>
    req<POLine>(`/api/purchasing/orders/${poId}/lines/${lineId}/receive`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectListItem {
  id: number;
  name: string;
  client_name: string;
  project_number: string;
  project_type: string;
  current_state: string;
  start_date?: string;
  approval_date?: string;
  fcs_delivery_date?: string;
  created_at: string;
}

export interface StateHistory {
  id: number;
  from_state?: string;
  to_state: string;
  reason?: string;
  changed_at: string;
}

export interface Project extends ProjectListItem {
  notes?: string;
  updated_at: string;
  state_history: StateHistory[];
  fcs_slots: FCSSlot[];
}

export interface MaterialPlanLine {
  id: number;
  plan_id: number;
  material_type: string;
  description: string;
  quantity: number;
  unit: string;
  supplier_name: string;
  is_received: boolean;
  received_at?: string;
  notes?: string;
}

export interface MaterialPlan {
  id: number;
  project_id: number;
  notes?: string;
  created_at: string;
  lines: MaterialPlanLine[];
}

export interface WorkArea {
  id: number;
  name: string;
  description?: string;
  hours_per_day: number;
  work_start_hour: number;
  is_active: boolean;
}

export interface RouteStep {
  id: number;
  route_id: number;
  work_center_id: number;
  step_order: number;
  name: string;
  estimated_hours: number;
  can_parallel: boolean;
  work_center: WorkArea;
}

export interface ProcessRoute {
  id: number;
  name: string;
  project_type: string;
  description?: string;
  is_active: boolean;
  steps: RouteStep[];
}

export interface FCSSlot {
  id: number;
  project_id: number;
  work_center_id: number;
  step_name: string;
  planned_start: string;
  planned_end: string;
  actual_start?: string;
  actual_end?: string;
  is_manual: boolean;
  status: string;
  work_center: WorkArea;
}

export interface GanttTask {
  id: string;
  project_id: number;
  project_name: string;
  work_center: string;
  step_name: string;
  start: string;
  end: string;
  status: string;
  current_state: string;
  is_manual: boolean;
}

export interface Bottleneck {
  work_center_id: number;
  work_center_name: string;
  utilization_pct: number;
  scheduled_hours: number;
  available_hours: number;
}

export interface KanbanCard {
  id: number;
  name: string;
  client_name: string;
  project_number: string;
  project_type: string;
  current_state: string;
  fcs_delivery_date?: string;
  start_date?: string;
  approval_date?: string;
  materials_total: number;
  materials_received: number;
}

export interface KanbanColumn {
  state: string;
  label: string;
  cards: KanbanCard[];
}

export interface DashboardData {
  active_projects: number;
  materials_pending: number;
  bottlenecks: Bottleneck[];
  kanban: KanbanColumn[];
}

export interface InventoryRecord {
  quantity_available: number;
  quantity_reserved: number;
  warehouse_location?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_info?: string;
  tax_id?: string;
  payment_terms?: string;
  rating: number;
  notes?: string;
  is_active: boolean;
}

export interface Material {
  id: number;
  code: string;
  description: string;
  unit: string;
  category?: string;
  min_stock: number;
  is_special_order: boolean;
  inventory?: InventoryRecord;
}

export interface POLine {
  id: number;
  po_id: number;
  material_id: number;
  material: Material;
  quantity: number;
  unit_price?: number;
  currency: string;
  delivery_date_expected?: string;
  delivery_date_actual?: string;
  is_critical: boolean;
  status: string;
  notes?: string;
}

export interface PurchaseRequest {
  id: number;
  project_id?: number;
  material_id: number;
  material: Material;
  quantity_needed: number;
  urgency: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  supplier: Supplier;
  project_id?: number;
  currency: string;
  status: string;
  total_amount?: number;
  notes?: string;
  created_at: string;
  lines: POLine[];
}

export const STATE_LABELS: Record<string, string> = {
  entrada_informacion: "Entrada de Información",
  planos: "Planos",
  requisicion: "Requisición",
  produccion: "Producción",
  entrega: "Entrega",
};

export const STATES_ORDERED = [
  "entrada_informacion",
  "planos",
  "requisicion",
  "produccion",
  "entrega",
];

export const PROJECT_TYPES = [
  "metalmecanica",
  "carpinteria",
  "pintura",
  "ensamble",
  "mixto",
];
