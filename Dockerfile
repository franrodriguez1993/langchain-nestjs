FROM node:20.14-bullseye

# Crear un usuario no root
RUN groupadd -r appuser && useradd -r -g appuser -d /home/appuser -s /sbin/nologin -c "my_user" appuser

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Instalar Google Chrome
USER root
RUN apt-get update && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update && apt-get install -y google-chrome-stable \
       fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
       --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instalar las dependencias de Puppeteer
COPY package*.json ./
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Compilar el proyecto TypeScript a JavaScript
RUN npm run build

# Cambiar el propietario del directorio de trabajo
RUN chown -R appuser:appuser /usr/src/app

# Cambiar a un usuario no root
USER appuser

# Comando para ejecutar la aplicación
CMD ["npm", "run", "start:prod"]
