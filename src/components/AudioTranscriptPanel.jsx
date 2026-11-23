
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import {
  getAudioTranscript,
  retryAudioTranscript,
} from '@/features/content-author/api/contentImportApi.js';

const labels = {
  Pending: 'Đang chờ nhận dạng tiếng Nhật…',
  Processing: 'Đang nhận dạng tiếng Nhật…',
  Completed: 'Đã có bản chép lời tiếng Nhật',
  WaitingConfiguration: 'Đang chờ cấu hình dịch vụ nhận dạng',
  Failed: 'Chưa tạo được bản chép lời',
};

export default function AudioTranscriptPanel({ audioUrl }) {
  const { user } = useAuth();
  const client = useQueryClient();

  const queryKey = [
    'content-audio-transcript',
    user?.userId,
    audioUrl,
  ];

  const query = useQuery({
    queryKey,
    queryFn: () => getAudioTranscript(audioUrl),
    enabled: Boolean(audioUrl),
    retry: false,

    refetchInterval: (entry) => {
      const status = entry.state.data?.status;

      if (status === 'WaitingConfiguration') {
        return 15000;
      }

      return ['Pending', 'Processing'].includes(status)
        ? 3000
        : false;
    },
  });

  const retry = useMutation({
    mutationFn: () => retryAudioTranscript(audioUrl),

    onSuccess: (entry) => {
      client.setQueryData(queryKey, entry);

      void client.invalidateQueries({
        queryKey: ['content-audio-uploads', user?.userId],
      });
    },
  });

  if (!audioUrl) return null;

  const entry = query.data;

  return (
    <section className="mt-2 space-y-2 rounded-lg border border-card-border bg-white p-3 text-sm">
      <p role="status" className="font-medium">
        {query.isPending
          ? 'Đang tải bản chép lời…'
          : query.isError
            ? 'Chưa tải được bản chép lời'
            : entry
              ? labels[entry.status] ?? entry.status
              : 'Audio chưa có bản chép lời'}
      </p>

      {entry?.errorMessage && (
        <p className="text-[#765E6B]">
          {entry.errorMessage}
        </p>
      )}

      {entry?.transcript && (
        <details>
          <summary className="cursor-pointer font-semibold text-primary">
            Xem bản chép lời
          </summary>

          <p
            lang="ja"
            className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words leading-7"
          >
            {entry.transcript}
          </p>
        </details>
      )}

      {query.isSuccess && (!entry || entry.status === 'Failed') && (
        <button
          type="button"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
          className="rounded-lg border border-card-border px-3 py-2 font-semibold text-primary disabled:opacity-50"
        >
          {retry.isPending
            ? 'Đang gửi…'
            : entry
              ? 'Nhận dạng lại'
              : 'Tạo bản chép lời tiếng Nhật'}
        </button>
      )}

      {query.isError && (
        <button
          type="button"
          className="font-semibold text-primary underline"
          onClick={() => query.refetch()}
        >
          Thử tải lại
        </button>
      )}

      {retry.isError && (
        <p role="alert" className="text-rose-700">
          {retry.error.message}
        </p>
      )}
    </section>
  );
}
