require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const mysql = require('mysql');
const app = express();
const bcrypt = require('bcrypt'); 
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Teste das variáveis de ambiente
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// Configuração do Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'eventos',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false,
  }
);

// Models
const User = sequelize.define('user', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false },
}, {
  timestamps: false,
  freezeTableName: true,
});

const Desenvolvedor = sequelize.define('desenvolvedores', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome_dev: { type: DataTypes.STRING(255), allowNull: false },
  foto_URL: { type: DataTypes.STRING(300) },
  descricao_base: { type: DataTypes.TEXT },
}, {
  timestamps: true,
  freezeTableName: true,
});

const Projeto = sequelize.define('projeto', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome_projeto: { type: DataTypes.STRING(255), allowNull: false },
  foto_URL: { type: DataTypes.STRING(300), allowNull: false },
  data_projeto: { type: DataTypes.STRING(20), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  desenvolvedores_id: { type: DataTypes.INTEGER }
}, {
  timestamps: true,
  freezeTableName: true,
});

const Evento = sequelize.define('evento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING(255), allowNull: false },
  data: { type: DataTypes.STRING(20), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  imagem: { type: DataTypes.STRING(300) },
  envolvidos: { type: DataTypes.STRING(255) },
}, {
  timestamps: true,
  freezeTableName: true,
});

const GaleriaEvento = sequelize.define('galeria_evento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  url_imagem: { type: DataTypes.STRING(500), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  evento_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  timestamps: true,
  freezeTableName: true,
});

// Relacionamentos
Desenvolvedor.hasMany(Projeto, { foreignKey: 'desenvolvedores_id' });
Projeto.belongsTo(Desenvolvedor, { foreignKey: 'desenvolvedores_id' });
Evento.hasMany(GaleriaEvento, { foreignKey: 'evento_id' });
GaleriaEvento.belongsTo(Evento, { foreignKey: 'evento_id' });

// Rotas de cadastro e login
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const hash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome, email, senha: hash });
    res.json({ message: 'Usuário cadastrado!', user });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao cadastrar usuário', details: err });
  }
});
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });
    res.json({ message: 'Login realizado com sucesso!', user });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao fazer login', details: err });
  }
});

// CRUD User
app.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.post('/users', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome, email, senha: hash });
    res.json({ message: 'Usuário criado!', user });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar usuário', details: err });
  }
});


app.put('/users/:id', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    let updateData = { nome, email };
    if (senha) {
      updateData.senha = await bcrypt.hash(senha, 10);
    }
    await User.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Usuário atualizado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar usuário', details: err });
  }
});


app.delete('/users/:id', async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Usuário deletado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao deletar usuário', details: err });
  }
});

app.get('/desenvolvedores', async (req, res) => {
  const devs = await Desenvolvedor.findAll();
  res.json(devs);
});

app.post('/desenvolvedores', upload.single('foto_URL'), async (req, res) => {
  try {
    const { nome_dev, descricao_base, senha } = req.body;
    let foto_URL = req.file ? req.file.path : null;
    let devData = { nome_dev, foto_URL, descricao_base };
    if (senha) {
      devData.senha = await bcrypt.hash(senha, 10);
    }
    const dev = await Desenvolvedor.create(devData);
    res.json({ message: 'Desenvolvedor criado!', dev });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar desenvolvedor', details: err });
  }
});


app.put('/desenvolvedores/:id', upload.single('foto_URL'), async (req, res) => {
  try {
    const { nome_dev, descricao_base, senha } = req.body;
    let updateData = { nome_dev, descricao_base };
    if (req.file) updateData.foto_URL = req.file.path;
    if (senha) updateData.senha = await bcrypt.hash(senha, 10);
    await Desenvolvedor.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Desenvolvedor atualizado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar desenvolvedor', details: err });
  }
});

app.delete('/desenvolvedores/:id', async (req, res) => {
  try {
    await Desenvolvedor.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Desenvolvedor deletado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao deletar desenvolvedor', details: err });
  }
});

app.get('/projetos/:id', async (req, res) => {
  const projetos = await Projeto.findAll();
  res.json(projetos);
});

app.post('/projetos', upload.single('foto_URL'), async (req, res) => {
  try {
    const { nome_projeto, data_projeto, descricao, desenvolvedores_id } = req.body;
    let foto_URL = req.file ? req.file.path : null;
    const projeto = await Projeto.create({ nome_projeto, foto_URL, data_projeto, descricao, desenvolvedores_id });
    res.json({ message: 'Projeto criado!', projeto });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar projeto', details: err });
  }
});

app.put('/projetos/:id', upload.single('foto_URL'), async (req, res) => {
  try {
    const { nome_projeto, data_projeto, descricao, desenvolvedores_id } = req.body;
    let updateData = { nome_projeto, data_projeto, descricao, desenvolvedores_id };
    if (req.file) updateData.foto_URL = req.file.path;
    await Projeto.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Projeto atualizado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar projeto', details: err });
  }
});

app.delete('/projetos/:id', async (req, res) => {
  try {
    await Projeto.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Projeto deletado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao deletar projeto', details: err });
  }
});

app.get('/eventos', async (req, res) => {
  const eventos = await Evento.findAll();
  res.json(eventos);
});

app.post('/eventos', upload.single('imagem'), async (req, res) => {
  try {
    const { nome, data, descricao, envolvidos } = req.body;
    let imagem = req.file ? req.file.path : null;
    const evento = await Evento.create({ nome, data, descricao, imagem, envolvidos });
    res.json({ message: 'Evento criado!', evento });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar evento', details: err });
  }
});

app.put('/eventos/:id', upload.single('imagem'), async (req, res) => {
  try {
    const { nome, data, descricao, envolvidos } = req.body;
    let updateData = { nome, data, descricao, envolvidos };
    if (req.file) updateData.imagem = req.file.path;
    await Evento.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Evento atualizado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar evento', details: err });
  }
});


app.delete('/eventos/:id', async (req, res) => {
  try {
    await Evento.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Evento deletado!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao deletar evento', details: err });
  }
});

app.get('/galeria_eventos', async (req, res) => {
  const imagens = await GaleriaEvento.findAll();
  res.json(imagens);
});

app.post('/galeria_eventos', upload.single('imagem'), async (req, res) => {
  try {
    const { descricao, evento_id } = req.body;
    const url_imagem = req.file ? req.file.path : null;
    if (!url_imagem) return res.status(400).json({ error: 'Imagem obrigatória!' });
    const imagem = await GaleriaEvento.create({ url_imagem, descricao, evento_id });
    res.json({ message: 'Imagem adicionada à galeria do evento!', imagem });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao adicionar imagem', details: err });
  }
});

app.put('/galeria_eventos/:id', upload.single('imagem'), async (req, res) => {
  try {
    const { descricao, evento_id } = req.body;
    let updateData = { descricao, evento_id };
    if (req.file) updateData.url_imagem = req.file.path;
    await GaleriaEvento.update(updateData, { where: { id: req.params.id } });
    res.json({ message: 'Imagem da galeria do evento atualizada!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar imagem', details: err });
  }
});

app.delete('/galeria_eventos/:id', async (req, res) => {
  try {
    await GaleriaEvento.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Imagem da galeria do evento deletada!' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao deletar imagem', details: err });
  }
});


const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados MySQL:', err.message);
    return;
  }
  console.log('Conexão com o banco de dados MySQL estabelecida com sucesso.');
});

sequelize.sync({ alter: true })
  .then(() => {
    app.listen(3000, () => console.log('API rodando na porta 3000'));
  })
  .catch(err => console.error('Erro ao sincronizar tabelas:', err));

  module.exports = app;