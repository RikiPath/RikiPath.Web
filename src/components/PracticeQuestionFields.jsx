export default function PracticeQuestionFields({ questions, answers, onAnswer, disabled, name }) {
  return questions.map((question, index) => (
    <fieldset key={question.questionId} className="rounded-lg border border-card-border p-3" disabled={disabled}>
      <legend className="max-w-full break-words px-1 font-semibold">{index + 1}. {question.questionText}</legend>
      {question.options.map(option => (
        <label key={option.optionId} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-primary-light">
          <input type="radio" className="mt-1 accent-primary" name={name + '-' + question.questionId}
            checked={answers[question.questionId] === option.optionId}
            onChange={() => onAnswer(question.questionId, option.optionId)} />
          <span>{option.optionText}</span>
        </label>
      ))}
    </fieldset>
  ));
}
