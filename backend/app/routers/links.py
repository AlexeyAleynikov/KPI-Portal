from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.links import LinkSection, Link, RoleLinkSection

router = APIRouter()


@router.get("/")
async def get_links(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Возвращает секции ссылок для текущего пользователя (по роли + глобальные)."""
    # Глобальные секции
    global_result = await db.execute(
        select(LinkSection).where(LinkSection.is_global == True)
    )
    global_sections = global_result.scalars().all()

    role_sections = []
    if current_user.portal_role_id:
        rls_result = await db.execute(
            select(RoleLinkSection).where(
                RoleLinkSection.role_id == current_user.portal_role_id
            )
        )
        rls = rls_result.scalars().all()
        section_ids = [r.section_id for r in rls]
        if section_ids:
            s_result = await db.execute(
                select(LinkSection).where(LinkSection.id.in_(section_ids))
            )
            role_sections = s_result.scalars().all()

    # Объединяем, дедуплицируем
    seen = set()
    sections = []
    for s in global_sections + role_sections:
        if s.id not in seen:
            seen.add(s.id)
            sections.append(s)

    sections.sort(key=lambda x: x.order)

    # Загружаем ссылки для каждой секции
    result = []
    for section in sections:
        links_result = await db.execute(
            select(Link).where(Link.section_id == section.id, Link.is_active == True)
            .order_by(Link.order)
        )
        links = links_result.scalars().all()
        result.append({
            "id": section.id,
            "name": section.name,
            "icon": section.icon,
            "links": [
                {
                    "id": lnk.id,
                    "name": lnk.name,
                    "url": lnk.url,
                    "icon": lnk.icon,
                    "description": lnk.description,
                    "open_in_iframe": lnk.open_in_iframe,
                }
                for lnk in links
            ]
        })
    return result
