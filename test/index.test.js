const smartPages = require('..')

// TODO: Implement module test
test('smart-pages', () => {
  expect(smartPages('w')).toBe('w@zce.me')
  expect(smartPages('w', { host: 'wedn.net' })).toBe('w@wedn.net')
  expect(() => smartPages(100)).toThrow('Expected a string, got number')
})
