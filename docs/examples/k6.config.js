import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const myTrend = new Trend('waiting_time');

export const options = {
  vus: 10,
  duration: '5m',

  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.05'],
    'waiting_time': ['avg<300'],
  },

  ext: {
    loadimpact: {
      projectID: 1234567,
      name: 'My test',
    },
  },
};

const BASE_URL = 'https://api.example.com';

export default function () {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username: 'testuser',
    password: 'testpass',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has auth token': (r) => r.json('token') !== '',
  });

  errorRate.add(loginRes.status !== 200);
  myTrend.add(loginRes.timings.waiting);

  const token = loginRes.json('token');

  const dashboardRes = http.get(`${BASE_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
