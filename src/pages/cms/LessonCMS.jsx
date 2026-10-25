import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const SKILLS = ['Ngữ pháp', 'Từ vựng', 'Hán tự', 'Đọc', 'Nghe'];

export default function LessonCMS() {
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="LessonCMS"
      breadcrumb="Bài học"
      title="Bài học"
      hint="Danh sách bài để soạn. Dữ liệu mới chỉ nằm trên trình duyệt."
      addLabel="Thêm bài"
      detail={{ to: '/lesson-cms-detail', label: 'Xem một bài' }}
      columns={[
        { key: 'title', label: 'Bài' },
        { key: 'level', label: 'Cấp' },
        { key: 'skill', label: 'Kỹ năng' },
        { key: 'status', label: 'Trạng thái' },
      ]}
      fields={[
        { key: 'title', label: 'Tên bài', required: true, wide: true },
        { key: 'level', label: 'Cấp', type: 'select', options: LEVELS, default: 'N3' },
        { key: 'skill', label: 'Kỹ năng', type: 'select', options: SKILLS, default: 'Ngữ pháp' },
        {
          key: 'status',
          label: 'Trạng thái',
          type: 'select',
          options: ['Nháp', 'Chờ duyệt'],
          default: 'Nháp',
          wide: true,
        },
      ]}
      seed={[
        { id: 1, sample: true, title: 'わけにはいかない', level: 'N3', skill: 'Ngữ pháp', status: 'Nháp' },
        { id: 2, sample: true, title: 'Chữ 咲', level: 'N3', skill: 'Hán tự', status: 'Nháp' },
      ]}
    />
  );
}
