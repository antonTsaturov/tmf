import { FilterKey } from "@/components/StudyDocumentSearch";
import { DocumentLink } from "@/types/document";
import { ViewLevel } from "@/types/types";


export const searchConfig = {
  staleTime: 30 * 1000, // 30 секунд для поиска - более актуальные данные
  gcTime: 5 * 60 * 1000, // 5 минут в кэше (вместо cacheTime в v5)
  refetchOnWindowFocus: false, // Не обновлять при фокусе окна
  retry: 1, // Только 1 повтор при ошибке
}

export const fetchDocuments = async (
  query: string,
  filter: FilterKey,
  signal?: AbortSignal
): Promise<DocumentLink[]> => {
  // 🔒 защита от лишних вызовов (дополнительно к enabled в react-query)
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    filter: filter === "all" ? "all" : String(filter),
  });

  const response = await fetch(
    `/api/documents/search?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      signal,
    }
  );

  // 🔐 auth handling
  if (response.status === 401) {
    throw new Error("Session expired");
  }

  if (!response.ok) {
    let message = "Failed to fetch documents";

    try {
      const errorData = await response.json();
      message = errorData.error || message;
    } catch {
      // ignore JSON parse error
    }

    throw new Error(message);
  }

  const data = await response.json();

  // 🧠 гарантируем стабильный контракт
  return data.documents ?? [];
};

export const fetchLastDocuments = async (params: {
  depth: number;
  studyId: number;
  viewLevel: ViewLevel;
  country?: string;
  siteId?: string;
}) => {

  const query = new URLSearchParams({
    depth: String(params.depth),
    studyId: String(params.studyId),
    viewLevel: params.viewLevel,
    ...(params.country && { country: params.country }),
    ...(params.siteId && { siteId: params.siteId }),
  });

  const res = await fetch(`/api/documents/last?${query.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    throw new Error(text);
  }

  return res.json();
};

interface Params {
  studyId: number;
  depth: number;
  viewLevel: ViewLevel;
  country?: string | null;
  siteId?: string | null;
}

export const buildLastDocumentsQuery = (params: Params) => {
  const { studyId, depth, viewLevel, country, siteId } = params;

  const filters: string[] = [
    `d.study_id = $1`,
    `d.is_deleted = FALSE`,
  ];

  const values: any[] = [studyId];
  let i = 2;

  const normalize = (v: any) =>
    typeof v === "undefined" || v === "undefined" || v === "null" ? undefined : v;

  const safeSiteId = normalize(siteId);
  const safeCountry = normalize(country);  

  // Логика фильтрации в зависимости от уровня просмотра
  if (viewLevel === ViewLevel.GENERAL) {
    // General level: только документы без site_id и country
    filters.push(`d.site_id IS NULL`);
    filters.push(`d.country IS NULL`);
  }
  
  else if (viewLevel === ViewLevel.COUNTRY && safeCountry) {
    // Country level: документы с указанной страной, site_id должен быть NULL
    filters.push(`d.country = $${i++}`);
    filters.push(`d.site_id IS NULL`);
    values.push(safeCountry);
  }
  
  else if (viewLevel === ViewLevel.SITE && safeSiteId) {
    // Site level: документы с указанным site_id (country может быть любым или NULL)
    filters.push(`d.site_id = $${i++}`);
    values.push(safeSiteId);
  }
  
  else {
    // Fallback: если параметры не соответствуют ожиданиям - ничего не возвращаем
    console.warn('Invalid parameters for buildLastDocumentsQuery:', { viewLevel, country, siteId });
    return { query: `SELECT * FROM document WHERE 1=0`, values: [] };
  }
  
  const query = `
    SELECT
      d.id,
      dv.document_name,
      d.folder_id,
      d.country,
      dv.uploaded_at,
      u.name AS uploaded_by,

      s.id AS study_id,
      s.title AS study_title,
      s.protocol AS study_protocol,
      s.status AS study_status,

      st.id AS site_id,
      st.name AS site_name,
      st.country AS site_country,
      st.city AS site_city,
      st.status AS site_status,

      dv.review_status

    FROM document d

    JOIN document_version dv 
      --ON dv.id = d.current_version_id
      ON dv.document_id = d.id

    JOIN study s 
      ON s.id = d.study_id

    LEFT JOIN site st 
      ON st.id = d.site_id

    LEFT JOIN users u 
      ON u.id = d.created_by

    WHERE ${filters.join(" AND ")}

    ORDER BY d.created_at DESC
    LIMIT $${i}
  `;

  values.push(depth);

  return { query, values };
};