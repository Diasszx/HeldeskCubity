import { provisionUsers } from '../src/prisma/provision-demo.js';

const users = [
  { username: 'user.one', name: 'User One', password: 'test-password-one' },
  { username: 'user.two', name: 'User Two', password: 'test-password-two' },
];
it('normalizes logins consistently with authentication and preserves password spaces', () => {
  const input = [
    { ...users[0], username: ' USER.ONE ', password: ' test-password-one ' },
    users[1],
  ];
  expect(provisionUsers(JSON.stringify(input))[0]).toMatchObject({
    username: 'user.one',
    password: input[0].password,
  });
});
it.each([
  undefined,
  'invalid-json',
  '[]',
  JSON.stringify([users[0]]),
  JSON.stringify([users[0], { ...users[1], username: 'USER.ONE' }]),
  JSON.stringify([{ ...users[0], password: 'short' }, users[1]]),
  JSON.stringify([{ ...users[0], password: '😀'.repeat(19) }, users[1]]),
  JSON.stringify([{ ...users[0], role: 'admin' }, users[1]]),
])(
  'rejects invalid provisioning input without leaking credentials',
  (value) => {
    try {
      provisionUsers(value);
      throw new Error('Expected validation failure');
    } catch (error) {
      expect((error as Error).message).toContain('DEMO_USERS_JSON inválido');
      expect((error as Error).message).not.toContain('test-password');
    }
  },
);
