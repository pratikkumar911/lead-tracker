import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/server';
import { Lead } from '../src/Lead';

const app = createApp();
let mongo: MongoMemoryServer;

const validLead = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+1 415 555 0100',
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Lead.deleteMany({});
});

describe('GET /health', () => {
  it('reports the service as healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /leads', () => {
  it('creates a lead with the default status and a createdAt timestamp', async () => {
    const res = await request(app).post('/leads').send(validLead);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: validLead.name,
      email: validLead.email,
      phone: validLead.phone,
      status: 'New',
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data._id).toBeUndefined();
  });

  it('rejects an invalid payload with field level errors', async () => {
    const res = await request(app)
      .post('/leads')
      .send({ name: 'A', email: 'not-an-email', phone: '123' });

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(
      expect.arrayContaining(['name', 'email', 'phone']),
    );
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/leads').send(validLead);
    const res = await request(app).post('/leads').send(validLead);
    expect(res.status).toBe(409);
  });
});

describe('GET /leads', () => {
  beforeEach(async () => {
    await Lead.create([
      { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+1 415 555 0100', status: 'New' },
      { name: 'Grace Hopper', email: 'grace@example.com', phone: '+1 415 555 0101', status: 'Won' },
      { name: 'Alan Turing', email: 'alan@example.com', phone: '+44 20 7946 0000', status: 'Contacted' },
    ]);
  });

  it('returns a paginated list with meta information', async () => {
    const res = await request(app).get('/leads?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 3, page: 1, limit: 2, totalPages: 2 });
  });

  it('searches across name, email and phone', async () => {
    const byName = await request(app).get('/leads?search=grace');
    expect(byName.body.data[0].name).toBe('Grace Hopper');

    const byPhone = await request(app).get('/leads?search=7946');
    expect(byPhone.body.data[0].name).toBe('Alan Turing');
  });

  it('filters by status', async () => {
    const res = await request(app).get('/leads?status=Won');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('grace@example.com');
  });
});

describe('PATCH /leads/:id/status', () => {
  it('moves a lead to a new status', async () => {
    const created = await request(app).post('/leads').send(validLead);
    const res = await request(app)
      .patch(`/leads/${created.body.data.id}/status`)
      .send({ status: 'Qualified' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Qualified');
  });

  it('rejects an unsupported status value', async () => {
    const created = await request(app).post('/leads').send(validLead);
    const res = await request(app)
      .patch(`/leads/${created.body.data.id}/status`)
      .send({ status: 'Nope' });
    expect(res.status).toBe(422);
  });
});

describe('DELETE /leads/:id', () => {
  it('removes the lead', async () => {
    const created = await request(app).post('/leads').send(validLead);
    const res = await request(app).delete(`/leads/${created.body.data.id}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /leads/stats', () => {
  it('aggregates leads by status', async () => {
    await Lead.create([
      { name: 'A One', email: 'a@example.com', phone: '+1 415 555 0100', status: 'New' },
      { name: 'B Two', email: 'b@example.com', phone: '+1 415 555 0101', status: 'New' },
      { name: 'C Three', email: 'c@example.com', phone: '+1 415 555 0102', status: 'Won' },
    ]);

    const res = await request(app).get('/leads/stats');
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.byStatus.New).toBe(2);
    expect(res.body.data.byStatus.Won).toBe(1);
  });
});
