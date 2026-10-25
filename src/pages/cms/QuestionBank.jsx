import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const SKILLS = ['Từ vựng', 'Ngữ pháp', 'Đọc', 'Nghe'];

export default function QuestionBank() {
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="QuestionBank"
      breadcrumb="Ngân hàng câu hỏi"
      title="Ngân hàng câu hỏi"
      hint="Soạn câu trên trang này. Chưa lưu vào kho."
      addLabel="Thêm câu"
      columns={[
        { key: 'prompt', label: 'Câu hỏi' },
        { key: 'skill', label: 'Kỹ năng' },
        { key: 'level', label: 'Cấp' },
        { key: 'answer', label: 'Đáp án' },
      ]}
      fields={[
        { key: 'prompt', label: 'Câu hỏi', required: true, wide: true },
        { key: 'skill', label: 'Kỹ năng', type: 'select', options: SKILLS, default: 'Ngữ pháp' },
        { key: 'level', label: 'Cấp', type: 'select', options: LEVELS, default: 'N3' },
        { key: 'answer', label: 'Đáp án', wide: true },
      ]}
      seed={[
        {
          id: 1,
          sample: true,
          prompt: '明日は雨に違いない。',
          skill: 'Ngữ pháp',
          level: 'N3',
          answer: 'Chắc chắn ngày mai mưa',
        },
      ]}
    />
  );
}
