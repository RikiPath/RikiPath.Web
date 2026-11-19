import { useMutation } from '@tanstack/react-query';
import {
    previewContentImport,
    confirmContentImport,
} from '../api/contentImportApi.js';

/** Step 1 - xem trước file Excel (không lưu gì). Dùng: preview.mutate({ file, entityType }). */
export function usePreviewContentImportMutation() {
    return useMutation({
        mutationFn: ({ file, entityType, audioFiles, imageFiles }) => previewContentImport(file, entityType, audioFiles, imageFiles),
    });
}

/** Step 2 - lưu các dòng hợp lệ thành bản nháp của tác giả. */
export function useConfirmContentImportMutation() {
    return useMutation({
        mutationFn: (payload) => confirmContentImport(payload),
    });
}
