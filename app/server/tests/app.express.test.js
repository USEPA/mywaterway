describe('ServerCheck', () => {
  test('Loading express with no TS API Key', function () {
    const originalEnv = { ...process.env };
    delete process.env.GLOSSARY_AUTH;

    expect(() => {
      require('../app/app');
    }).toThrow(Error);

    process.env = originalEnv;
  });

  test('Test2', function () {
    expect(() => {
      require('../app/app');
    }).not.toThrow(Error);
  });

  test('Test3', function () {
    expect(true).toBe(true);
  });
});
