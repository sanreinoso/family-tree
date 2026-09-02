module.exports = {
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'es5',
  overrides: [
    {
      files: '*.html',
      options: {
        parser: 'angular',
      },
    },
  ],
};
