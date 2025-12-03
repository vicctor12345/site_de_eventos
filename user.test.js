
const request = require('supertest');
const app = require('./index'); // ajuste o caminho se necessário

describe('Testes da API de Usuários', () => {
  it('Deve criar um novo usuário', async () => {
    const res = await request(app)
      .post('/users')
      .send({
        nome: 'Teste',
        email: 'teste@jest.com',
        senha: '123456'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('user');
  });
});