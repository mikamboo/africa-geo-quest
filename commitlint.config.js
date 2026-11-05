// Messages en français et trailer Co-Authored-By acceptés :
// on garde les types conventionnels, sans contrainte de casse ni de longueur de pied de page.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
