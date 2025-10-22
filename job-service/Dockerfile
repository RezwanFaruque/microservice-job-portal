FROM node:20.11-alpine

WORKDIR /job-service

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5001

CMD ["npm", "start"]