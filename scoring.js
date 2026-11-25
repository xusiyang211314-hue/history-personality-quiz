"use strict";

function scoreAnswers(answers, questions = QUESTIONS) {
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw new RangeError("请完成全部题目后再查看结果。");
  }

  const scores = Object.fromEntries(Object.keys(DIMENSIONS).map((dimension) => [dimension, 0]));
  const choices = questions.map((question, index) => {
    const answer = answers[index];
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) {
      throw new RangeError(`第 ${index + 1} 题缺少有效选项。`);
    }
    const { dimension } = question.options[answer];
    scores[dimension] += 1;
    return dimension;
  });

  const ranked = PROFILES.map((profile) => ({
    profile,
    primaryCount: scores[Object.keys(profile.weights)[0]],
    fit: Object.entries(profile.weights).reduce((sum, [dimension, weight]) => sum + scores[dimension] * weight, 0),
  }));

  // Prefer overall fit, then the archetype with more direct evidence. A remaining
  // tie is decided by the last answer that distinguishes the tied profiles.
  ranked.sort((left, right) => {
    const difference = (right.fit - left.fit) || (right.primaryCount - left.primaryCount);
    if (difference) return difference;
    for (let index = choices.length - 1; index >= 0; index -= 1) {
      const dimension = choices[index];
      const evidence = (right.profile.weights[dimension] || 0) - (left.profile.weights[dimension] || 0);
      if (evidence) return evidence;
    }
    return 0;
  });

  const tendencies = Object.entries(scores)
    .filter(([, count]) => count > 0)
    .sort(([left, a], [right, b]) => (b - a) || (choices.lastIndexOf(right) - choices.lastIndexOf(left)))
    .slice(0, 3);

  return { profile: ranked[0].profile, scores, tendencies };
}
