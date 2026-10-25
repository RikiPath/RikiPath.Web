import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function ExamBuilder() {
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="ExamBuilder"
      breadcrumb="Xây đề"
      title="Xây đề"
      hint="Nháp đề trên trang này. Chưa gửi lên máy chủ."
      addLabel="Thêm đề"
      columns={[
        { key: 'title', label: 'Đề' },
        { key: 'level', label: 'Cấp' },
        { key: 'minutes', label: 'Phút' },
        { key: 'note', label: 'Ghi chú' },
      ]}
      fields={[
        { key: 'title', label: 'Tên đề', required: true, wide: true },
        { key: 'level', label: 'Cấp', type: 'select', options: LEVELS, default: 'N3' },
        { key: 'minutes', label: 'Số phút', default: '60' },
        { key: 'note', label: 'Ghi chú', wide: true },
      ]}
      seed={[
        { id: 1, sample: true, title: 'Đề minh họa N3', level: 'N3', minutes: '60', note: 'Bố cục mẫu' },
      ]}
    />
  );
}
