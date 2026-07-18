import pool from '../config/db.js';
import { searchUsers } from '../controllers/authController.js';

async function test() {
  const req = {
    query: { query: 'asd' }
  };
  const res = {
    json: (data) => console.log('Response:', data),
    status: (code) => ({
      json: (err) => console.log('Error:', code, err)
    })
  };
  
  await searchUsers(req, res);
  process.exit(0);
}

test();
