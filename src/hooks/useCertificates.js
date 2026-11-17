import { useQuery } from '@tanstack/react-query';
import { getCertificateTypes, getLevelsByCertificate } from '../api/certificateApi.js';

export const certificateKeys = {
  allTypes: ['certificate-types'],
  levelsByCert: (typeId) => ['certificate-levels', typeId],
};

export function useCertificateTypesQuery() {
  return useQuery({
    queryKey: certificateKeys.allTypes,
    queryFn: getCertificateTypes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCertificateLevelsQuery(certificateTypeId) {
  return useQuery({
    queryKey: certificateKeys.levelsByCert(certificateTypeId),
    queryFn: () => getLevelsByCertificate(certificateTypeId),
    enabled: Boolean(certificateTypeId),
    staleTime: 5 * 60 * 1000,
  });
}
