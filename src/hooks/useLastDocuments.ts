import { useQuery } from "@tanstack/react-query";
import { fetchLastDocuments } from "@/lib/utils/search";
import { ViewLevel } from "@/types/types";


export const useLastDocuments = (params: {
  depth: number;
  studyId: number;
  viewLevel:  ViewLevel;
  country?: string;
  siteId?: string;
}) => {
  return useQuery({
    queryKey: ["lastDocuments", params],
    queryFn: () => fetchLastDocuments(params),

    //enabled: !!params.studyId, 

    // 🔥 КЕШ
    staleTime: 1000 * 60, // 1 минута
    gcTime: 1000 * 60 * 2, // 2 минут

    // UX
    //keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
};