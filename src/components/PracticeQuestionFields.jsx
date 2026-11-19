export default function PracticeQuestionFields({ questions, answers, onAnswer, disabled, name }) {
  return questions.map((question, index) => (
    <fieldset key={question.questionId} className="rounded-lg border border-card-border p-3" disabled={disabled}>
      <legend className="max-w-full break-words px-1 font-semibold">{index + 1}. {question.questionText}</legend>
      {question.imageUrl && <img src={question.imageUrl} alt={'Hình câu ' + (index + 1)} loading="lazy" className="my-2 max-h-80 max-w-full rounded-lg object-contain" />}
      {question.options.map(option => (
        <label key={option.optionId} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-primary-light">
          <input type="radio" className="mt-1 accent-primary" name={name + '-' + question.questionId}
            checked={answers[question.questionId] === option.optionId}
            onChange={() => onAnswer(question.questionId, option.optionId)} />
          <span>{option.optionText}{option.imageUrl && <img src={option.imageUrl} alt="Hình lựa chọn" loading="lazy" className="mt-1 max-h-48 max-w-full object-contain" />}</span>
        </label>
      ))}
    </fieldset>
  ));
}
