const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error en la solicitud");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Health
  health: () => req<{ status: string }>("/api/health"),

  // Dashboard
  dashboardStats: () => req<DashboardStats>("/api/purchasing/dashboard/stats"),

  // Customers
  listCustomers: () => req<Customer[]>("/api/projects/customers"),
  createCustomer: (body: Partial<Customer>) =>
    req<Customer>("/api/projects/customers", { method: "POST", body: JSON.stringify(body) }),

  // Orders
  listOrders: () => req<CommercialOrder[]>("/api/projects/orders"),
  createOrder: (body: object) =>
    req<CommercialOrder>("/api/projects/orders", { method: "POST", body: JSON.stringify(body) }),

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
  stateLabels: () => req<Record<string, string>>("/api/projects/states/labels"),

  // Work Centers
  listWorkCenters: () => req<WorkCenter[]>("/api/workcenters"),
  createWorkCenter: (body: object) =>
    req<WorkCenter>("/api/workcenters", { method: "POST", body: JSON.stringify(body) }),
  updateWorkCenter: (id: number, body: object) =>
    req<WorkCenter>(`/api/workcenters/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Process Routes
  listRoutes: () => req<ProcessRoute[]>("/api/workcenters/routes"),
  createRoute: (body: object) =>
    req<ProcessRoute>("/api/workcenters/routes", { method: "POST", body: JSON.stringify(body) }),
  addRouteStep: (routeId: number, body: object) =>
    req<RouteStep>(`/api/workcenters/routes/${routeId}/steps`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteRouteStep: (routeId: number, stepId: number) =>
    req<void>(`/api/workcenters/routes/${routeId}/steps/${stepId}`, { method: "DELETE" }),

  // FCS
  scheduleProject: (projectId: number) =>
    req<FCSSlot[]>(`/api/fcs/schedule/${projectId}`, { method: "POST" }),
  ganttData: () => req<GanttTask[]>("/api/fcs/gantt"),
  bottlenecks: (days?: number) =>
    req<Bottleneck[]>(`/api/fcs/bottlenecks${days ? `?window_days=${days}` : ""}`),
  updateSlot: (slotId: number, body: object) =>
    req<FCSSlot>(`/api/fcs/slots/${slotId}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Materials
  listMaterials: (lowStock?: boolean) =>
    req<Material[]>(`/api/purchasing/materials${lowStock ? "?low_stock=true" : ""}`),
  getMaterial: (id: number) => req<Material>(`/api/purchasing/materials/${id}`),
  createMaterial: (body: object) =>
    req<Material>("/api/purchasing/materials", { method: "POST", body: JSON.stringify(body) }),
  updateInventory: (id: number, body: object) =>
    req<InventoryRecord>(`/api/purchasing/materials/${id}/inventory`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // Suppliers
  listSuppliers: () => req<Supplier[]>("/api/purchasing/suppliers"),
  createSupplier: (body: object) =>
    req<Supplier>("/api/purchasing/suppliers", { method: "POST", body: JSON.stringify(body) }),
  updateSupplier: (id: number, body: object) =>
    req<Supplier>(`/api/purchasing/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  supplierMaterials: (supplierId: number) =>
    req<SupplierMaterial[]>(`/api/purchasing/suppliers/${supplierId}/materials`),
  addPriceQuote: (smId: number, body: object) =>
    req<SupplierMaterial>(`/api/purchasing/suppliers/materials/${smId}/quote`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // BOM
  getBOM: (projectId: number) => req<BOM>(`/api/purchasing/bom/${projectId}`),
  createBOM: (projectId: number, body?: object) =>
    req<BOM>(`/api/purchasing/bom/${projectId}`, { method: "POST", body: JSON.stringify(body || {}) }),
  addBOMLine: (projectId: number, body: object) =>
    req<BOMLine>(`/api/purchasing/bom/${projectId}/lines`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteBOMLine: (projectId: number, lineId: number) =>
    req<void>(`/api/purchasing/bom/${projectId}/lines/${lineId}`, { method: "DELETE" }),
  approveBOM: (projectId: number) =>
    req<BOM>(`/api/purchasing/bom/${projectId}/approve`, { method: "POST" }),
  bomInventoryCheck: (projectId: number) =>
    req<BOMInventoryCheck[]>(`/api/purchasing/bom/${projectId}/inventory-check`),

  // Purchase Requests
  listRequests: (projectId?: number) =>
    req<PurchaseRequest[]>(
      `/api/purchasing/requests${projectId ? `?project_id=${projectId}` : ""}`
    ),
  createRequest: (body: object) =>
    req<PurchaseRequest>("/api/purchasing/requests", { method: "POST", body: JSON.stringify(body) }),

  // Purchase Orders
  listOrders2: (projectId?: number) =>
    req<PurchaseOrder[]>(
      `/api/purchasing/orders${projectId ? `?project_id=${projectId}` : ""}`
    ),
  getPurchaseOrder: (id: number) => req<PurchaseOrder>(`/api/purchasing/orders/${id}`),
  createPurchaseOrder: (body: object) =>
    req<PurchaseOrder>("/api/purchasing/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrderStatus: (id: number, status: string) =>
    req<void>(`/api/purchasing/orders/${id}/status?status=${status}`, { method: "PATCH" }),
  receiveLine: (poId: number, lineId: number, body: object) =>
    req<POLine>(`/api/purchasing/orders/${poId}/lines/${lineId}/receive`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Customer {
  id: number;
  name: string;
  contact_info?: string;
  tax_id?: string;
  created_at: string;
}

export interface CommercialOrder {
  id: number;
  customer_id: number;
  order_date: string;
  delivery_requested?: string;
  value?: number;
  notes?: string;
  customer: Customer;
}

export interface ProjectListItem {
  id: number;
  name: string;
  project_type: string;
  current_state: string;
  fcs_delivery_date?: string;
  created_at: string;
  customer_name: string;
}

export interface Project extends ProjectListItem {
  order_id: number;
  notes?: string;
  updated_at: string;
  order: CommercialOrder;
  state_history: StateHistory[];
  fcs_slots: FCSSlot[];
}

export interface StateHistory {
  id: number;
  from_state?: string;
  to_state: string;
  reason?: string;
  changed_at: string;
}

export interface WorkCenter {
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
  depends_on_step_id?: number;
  work_center: WorkCenter;
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
  status: string;
  work_center: WorkCenter;
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
}

export interface Bottleneck {
  work_center_id: number;
  work_center_name: string;
  utilization_pct: number;
  scheduled_hours: number;
  available_hours: number;
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

export interface InventoryRecord {
  id: number;
  material_id: number;
  quantity_available: number;
  quantity_reserved: number;
  warehouse_location?: string;
  last_updated: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_info?: string;
  tax_id?: string;
  payment_terms?: string;
  rating: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface SupplierMaterial {
  id: number;
  supplier_id: number;
  material_id: number;
  lead_time_days: number;
  price_history?: PriceEntry[];
  last_quoted?: string;
  notes?: string;
  material: Material;
}

export interface PriceEntry {
  date: string;
  price: number;
  currency: string;
  quantity: number;
  notes?: string;
}

export interface BOM {
  id: number;
  project_id: number;
  source: string;
  version: number;
  is_approved: boolean;
  notes?: string;
  created_at: string;
  lines: BOMLine[];
}

export interface BOMLine {
  id: number;
  bom_id: number;
  material_id: number;
  quantity_required: number;
  unit: string;
  is_critical: boolean;
  notes?: string;
  material: Material;
}

export interface BOMInventoryCheck {
  line_id: number;
  material_code: string;
  material_description: string;
  quantity_required: number;
  quantity_available: number;
  shortfall: number;
  is_critical: boolean;
  status: "ok" | "faltante" | "critico" | "bajo_minimo";
}

export interface PurchaseRequest {
  id: number;
  project_id: number;
  material_id: number;
  quantity_needed: number;
  urgency: string;
  status: string;
  notes?: string;
  created_at: string;
  material: Material;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  project_id?: number;
  status: string;
  total_amount?: number;
  currency: string;
  notes?: string;
  created_at: string;
  supplier: Supplier;
  lines: POLine[];
}

export interface POLine {
  id: number;
  po_id: number;
  material_id: number;
  quantity: number;
  unit_price?: number;
  currency: string;
  delivery_date_expected?: string;
  delivery_date_actual?: string;
  is_critical: boolean;
  status: string;
  notes?: string;
  material: Material;
}

export interface DashboardStats {
  active_projects: number;
  projects_by_state: Record<string, number>;
  bottlenecks: Bottleneck[];
  critical_po_pending: number;
  materials_below_min: number;
}
