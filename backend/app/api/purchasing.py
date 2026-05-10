from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    BOM,
    BOMLine,
    InventoryRecord,
    Material,
    POLine,
    PurchaseOrder,
    PurchaseRequest,
    Supplier,
    SupplierMaterial,
)
from app.schemas import (
    BOMCreate,
    BOMInventoryCheck,
    BOMLineCreate,
    BOMLineOut,
    BOMOut,
    InventoryOut,
    InventoryUpdate,
    MaterialCreate,
    MaterialOut,
    MaterialWithInventory,
    POLineOut,
    POLineStatusUpdate,
    PriceQuoteAdd,
    PurchaseOrderCreate,
    PurchaseOrderOut,
    PurchaseRequestCreate,
    PurchaseRequestOut,
    SupplierCreate,
    SupplierMaterialCreate,
    SupplierMaterialOut,
    SupplierOut,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# MATERIALS
# ---------------------------------------------------------------------------

@router.get("/materials", response_model=list[MaterialWithInventory])
def list_materials(
    low_stock: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Material)
    materials = q.order_by(Material.code).all()

    if low_stock:
        result = []
        for m in materials:
            inv = m.inventory
            available = inv.quantity_available if inv else 0
            if available <= m.min_stock:
                result.append(m)
        return result

    return materials


@router.post("/materials", response_model=MaterialOut, status_code=201)
def create_material(body: MaterialCreate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.code == body.code).first()
    if existing:
        raise HTTPException(400, f"Ya existe un material con código '{body.code}'")
    material = Material(**body.model_dump())
    db.add(material)
    db.flush()
    inv = InventoryRecord(material_id=material.id, quantity_available=0, quantity_reserved=0)
    db.add(inv)
    db.commit()
    db.refresh(material)
    return material


@router.get("/materials/{material_id}", response_model=MaterialWithInventory)
def get_material(material_id: int, db: Session = Depends(get_db)):
    m = db.get(Material, material_id)
    if not m:
        raise HTTPException(404, "Material no encontrado")
    return m


@router.patch("/materials/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: int, body: MaterialCreate, db: Session = Depends(get_db)
):
    m = db.get(Material, material_id)
    if not m:
        raise HTTPException(404, "Material no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(m, field, value)
    db.commit()
    db.refresh(m)
    return m


@router.patch("/materials/{material_id}/inventory", response_model=InventoryOut)
def update_inventory(
    material_id: int, body: InventoryUpdate, db: Session = Depends(get_db)
):
    m = db.get(Material, material_id)
    if not m:
        raise HTTPException(404, "Material no encontrado")
    inv = m.inventory
    if not inv:
        inv = InventoryRecord(material_id=material_id)
        db.add(inv)
    inv.quantity_available = body.quantity_available
    if body.quantity_reserved is not None:
        inv.quantity_reserved = body.quantity_reserved
    if body.warehouse_location is not None:
        inv.warehouse_location = body.warehouse_location
    db.commit()
    db.refresh(inv)
    return inv


# ---------------------------------------------------------------------------
# SUPPLIERS
# ---------------------------------------------------------------------------

@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).filter(Supplier.is_active.is_(True)).order_by(Supplier.name).all()


@router.post("/suppliers", response_model=SupplierOut, status_code=201)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db)):
    s = Supplier(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int, body: SupplierCreate, db: Session = Depends(get_db)
):
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(404, "Proveedor no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.get("/suppliers/{supplier_id}/materials", response_model=list[SupplierMaterialOut])
def supplier_materials(supplier_id: int, db: Session = Depends(get_db)):
    return (
        db.query(SupplierMaterial)
        .filter(SupplierMaterial.supplier_id == supplier_id)
        .all()
    )


@router.post("/suppliers/materials", response_model=SupplierMaterialOut, status_code=201)
def link_supplier_material(
    body: SupplierMaterialCreate, db: Session = Depends(get_db)
):
    sm = SupplierMaterial(**body.model_dump(), price_history=[])
    db.add(sm)
    db.commit()
    db.refresh(sm)
    return sm


@router.post("/suppliers/materials/{sm_id}/quote", response_model=SupplierMaterialOut)
def add_price_quote(
    sm_id: int, body: PriceQuoteAdd, db: Session = Depends(get_db)
):
    sm = db.get(SupplierMaterial, sm_id)
    if not sm:
        raise HTTPException(404, "Relación proveedor-material no encontrada")
    history = list(sm.price_history or [])
    history.append(
        {
            "date": datetime.utcnow().isoformat(),
            "price": body.price,
            "currency": body.currency,
            "quantity": body.quantity,
            "notes": body.notes,
        }
    )
    sm.price_history = history
    sm.last_quoted = datetime.utcnow()
    db.commit()
    db.refresh(sm)
    return sm


# ---------------------------------------------------------------------------
# BOM
# ---------------------------------------------------------------------------

@router.get("/bom/{project_id}", response_model=BOMOut)
def get_bom(project_id: int, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.project_id == project_id).first()
    if not bom:
        raise HTTPException(404, "BOM no encontrada para este proyecto")
    return bom


@router.post("/bom/{project_id}", response_model=BOMOut, status_code=201)
def create_bom(project_id: int, body: BOMCreate, db: Session = Depends(get_db)):
    existing = db.query(BOM).filter(BOM.project_id == project_id).first()
    if existing:
        raise HTTPException(400, "Ya existe una BOM para este proyecto")
    bom = BOM(project_id=project_id, **body.model_dump())
    db.add(bom)
    db.commit()
    db.refresh(bom)
    return bom


@router.post("/bom/{project_id}/lines", response_model=BOMLineOut, status_code=201)
def add_bom_line(
    project_id: int, body: BOMLineCreate, db: Session = Depends(get_db)
):
    bom = db.query(BOM).filter(BOM.project_id == project_id).first()
    if not bom:
        raise HTTPException(404, "BOM no encontrada")
    if bom.is_approved:
        raise HTTPException(400, "No se pueden agregar líneas a una BOM aprobada")
    if not db.get(Material, body.material_id):
        raise HTTPException(404, "Material no encontrado")
    line = BOMLine(bom_id=bom.id, **body.model_dump())
    db.add(line)
    db.commit()
    db.refresh(line)
    return line


@router.delete("/bom/{project_id}/lines/{line_id}", status_code=204)
def delete_bom_line(project_id: int, line_id: int, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.project_id == project_id).first()
    if not bom:
        raise HTTPException(404, "BOM no encontrada")
    line = db.get(BOMLine, line_id)
    if not line or line.bom_id != bom.id:
        raise HTTPException(404, "Línea no encontrada")
    db.delete(line)
    db.commit()


@router.post("/bom/{project_id}/approve", response_model=BOMOut)
def approve_bom(project_id: int, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.project_id == project_id).first()
    if not bom:
        raise HTTPException(404, "BOM no encontrada")
    bom.is_approved = True
    db.commit()
    db.refresh(bom)
    return bom


@router.get("/bom/{project_id}/inventory-check", response_model=list[BOMInventoryCheck])
def bom_inventory_check(project_id: int, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.project_id == project_id).first()
    if not bom:
        raise HTTPException(404, "BOM no encontrada")

    result = []
    for line in bom.lines:
        inv = line.material.inventory
        available = inv.quantity_available - inv.quantity_reserved if inv else 0
        shortfall = max(0, line.quantity_required - available)

        if shortfall > 0:
            status = "critico" if line.is_critical else "faltante"
        elif available < line.material.min_stock:
            status = "bajo_minimo"
        else:
            status = "ok"

        result.append(
            BOMInventoryCheck(
                line_id=line.id,
                material_code=line.material.code,
                material_description=line.material.description,
                quantity_required=line.quantity_required,
                quantity_available=available,
                shortfall=shortfall,
                is_critical=line.is_critical,
                status=status,
            )
        )
    return result


# ---------------------------------------------------------------------------
# PURCHASE REQUESTS
# ---------------------------------------------------------------------------

@router.get("/requests", response_model=list[PurchaseRequestOut])
def list_requests(
    project_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(PurchaseRequest)
    if project_id:
        q = q.filter(PurchaseRequest.project_id == project_id)
    if status:
        q = q.filter(PurchaseRequest.status == status)
    return q.order_by(PurchaseRequest.created_at.desc()).all()


@router.post("/requests", response_model=PurchaseRequestOut, status_code=201)
def create_request(body: PurchaseRequestCreate, db: Session = Depends(get_db)):
    request = PurchaseRequest(**body.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.patch("/requests/{req_id}/status")
def update_request_status(
    req_id: int, status: str, db: Session = Depends(get_db)
):
    purchase_request = db.get(PurchaseRequest, req_id)
    if not purchase_request:
        raise HTTPException(404, "Solicitud no encontrada")
    purchase_request.status = status
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# PURCHASE ORDERS
# ---------------------------------------------------------------------------

@router.get("/orders", response_model=list[PurchaseOrderOut])
def list_orders(
    project_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(PurchaseOrder)
    if project_id:
        q = q.filter(PurchaseOrder.project_id == project_id)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    return q.order_by(PurchaseOrder.created_at.desc()).all()


@router.post("/orders", response_model=PurchaseOrderOut, status_code=201)
def create_order(body: PurchaseOrderCreate, db: Session = Depends(get_db)):
    if not db.get(Supplier, body.supplier_id):
        raise HTTPException(404, "Proveedor no encontrado")

    po = PurchaseOrder(
        supplier_id=body.supplier_id,
        project_id=body.project_id,
        currency=body.currency,
        notes=body.notes,
    )
    db.add(po)
    db.flush()

    total = 0.0
    for line_data in body.lines:
        if not db.get(Material, line_data.material_id):
            raise HTTPException(404, f"Material {line_data.material_id} no encontrado")
        line = POLine(po_id=po.id, **line_data.model_dump())
        db.add(line)
        if line_data.unit_price:
            total += line_data.quantity * line_data.unit_price

    po.total_amount = total or None
    db.commit()
    db.refresh(po)
    return po


@router.get("/orders/{po_id}", response_model=PurchaseOrderOut)
def get_order(po_id: int, db: Session = Depends(get_db)):
    po = db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(404, "Orden de compra no encontrada")
    return po


@router.patch("/orders/{po_id}/status")
def update_order_status(po_id: int, status: str, db: Session = Depends(get_db)):
    po = db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(404, "Orden de compra no encontrada")
    po.status = status
    db.commit()
    return {"ok": True}


@router.patch("/orders/{po_id}/lines/{line_id}/receive", response_model=POLineOut)
def receive_line(
    po_id: int,
    line_id: int,
    body: POLineStatusUpdate,
    db: Session = Depends(get_db),
):
    line = db.get(POLine, line_id)
    if not line or line.po_id != po_id:
        raise HTTPException(404, "Línea no encontrada")
    line.status = body.status
    if body.delivery_date_actual:
        line.delivery_date_actual = body.delivery_date_actual
    if body.notes:
        line.notes = body.notes
    db.commit()
    db.refresh(line)
    return line


# ---------------------------------------------------------------------------
# DASHBOARD SUMMARY
# ---------------------------------------------------------------------------

@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    from app.fcs_engine import get_bottlenecks
    from app.models import Project

    projects = db.query(Project).all()
    by_state: dict[str, int] = {}
    for p in projects:
        by_state[p.current_state] = by_state.get(p.current_state, 0) + 1

    active = len([p for p in projects if p.current_state != "delivered"])

    critical_pending = (
        db.query(POLine)
        .filter(
            POLine.is_critical.is_(True),
            POLine.status.notin_(["received"]),
        )
        .count()
    )

    materials_low = (
        db.query(Material)
        .join(Material.inventory)
        .filter(
            InventoryRecord.quantity_available <= Material.min_stock,
            Material.min_stock > 0,
        )
        .count()
    )

    bottlenecks = get_bottlenecks(db, window_days=14)

    return {
        "active_projects": active,
        "projects_by_state": by_state,
        "bottlenecks": bottlenecks,
        "critical_po_pending": critical_pending,
        "materials_below_min": materials_low,
    }
