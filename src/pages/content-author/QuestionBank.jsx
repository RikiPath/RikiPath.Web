import { AUTHOR_LEVELS } from '@/features/content-author/constants/authorLevels.js';
import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';
import { useLocale } from '@/locales/locale.js';

const SKILLS = ['Từ vựng', 'Ngữ pháp', 'Đọc', 'Nghe'];

export default function QuestionBank() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="QuestionBank"
      breadcrumb={tr('Ngân hàng câu hỏi')}
      title={tr('Ngân hàng câu hỏi')}
      hint={tr('Soạn câu trên trang này. Chưa lưu vào kho.')}
      addLabel={tr('Thêm câu')}
      columns={[
        { key: 'prompt', label: 'Câu hỏi' },
        { key: 'skill', label: 'Kỹ năng' },
        { key: 'level', label: 'Cấp' },
        { key: 'answer', label: 'Đáp án' },
      ]}
      fields={[
        { key: 'prompt', label: 'Câu hỏi', required: true, wide: true },
        { key: 'skill', label: 'Kỹ năng', type: 'select', options: SKILLS, default: 'Ngữ pháp' },
        { key: 'level', label: 'Cấp', type: 'select', options: AUTHOR_LEVELS },
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
