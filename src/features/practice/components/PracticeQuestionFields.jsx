import { Radio, RichQuestionText } from '@/components/ui';

export default function PracticeQuestionFields({ questions, answers, onAnswer, disabled, name }) {
  return questions.map((question, index) => (
    <fieldset key={question.questionId} className="rounded-xl border border-rp-line bg-rp-surface p-3.5" disabled={disabled}>
      <legend className="max-w-full break-words px-1.5 text-sm font-semibold text-rp-text">
        {index + 1}. <RichQuestionText text={question.questionText} />
      </legend>
      <div className="mt-2 space-y-1.5">
        {question.options.map((option) => (
          <div key={option.optionId} className="rounded-lg px-2 py-1.5 hover:bg-rp-brand-tint/40">
            <Radio
              name={`${name}-${question.questionId}`}
              checked={answers[question.questionId] === option.optionId}
              onChange={() => onAnswer(question.questionId, option.optionId)}
              label={<RichQuestionText text={option.optionText} />}
            />
          </div>
        ))}
      </div>
    </fieldset>
  ));
}
