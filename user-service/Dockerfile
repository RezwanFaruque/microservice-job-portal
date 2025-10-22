FROM node:20.11-alpine

WORKDIR /user-service

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]