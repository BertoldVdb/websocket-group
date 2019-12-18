FROM alpine:latest AS cloner
RUN apk add git
WORKDIR /root/
ADD https://api.github.com/repos/WaxieSDR/websocket-group/git/refs/heads/master version.json
RUN git clone https://github.com/WaxieSDR/websocket-group.git

FROM node:12
ENV user node

COPY --from=cloner /root/websocket-group /home/$user/
WORKDIR /home/$user/websocket-group
RUN chown $user:$user --recursive .
USER $user

ENV NODE_ENV production
RUN npm install --only=production
CMD [ "npm", "start" ]

