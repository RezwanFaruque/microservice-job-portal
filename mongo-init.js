db = db.getSiblingDB('user_service');
db.createUser({
  user: 'user_service',
  pwd: 'user_service',
  roles: [{ role: 'readWrite', db: 'user_service' }],
});


db.createUser({
    user:"job_service",
    pwd:'job_service',
    roles:[{role:"readWrite",db:"job_service"}]
});