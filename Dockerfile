FROM alpine:latest AS cloner
RUN apk add git
WORKDIR /root/
RUN git clone https://github.com/BertoldVdb/websocket-group.git

FROM node:12

ENV user node

COPY --from=cloner /root/websocket-group /home/$user/
WORKDIR /home/$user/websocket-group
RUN chown $user:$user --recursive .
USER $user

ENV CONFIG_PATH /config/websocket-group.json
ENV NODE_ENV production
RUN npm install --only=production
CMD [ "npm", "start" ]

