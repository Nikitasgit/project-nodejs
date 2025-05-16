import http from "node:http";
import dotenv from "dotenv";
import path from "node:path";
import pug from "pug";
import fs from "node:fs";
import querystring from "node:querystring";
import { menuItems } from "./utils/constants.js";
import { formatDate, formatDateForInput } from "./utils/utils.js";

dotenv.config();

const { APP_HOST, APP_PORT } = process.env;

const dirname = import.meta.dirname;
const viewPath = path.join(dirname, "view");
const styleFilePath = path.join(dirname, "assets/css");
const dataPath = path.join(dirname, "data");
const usersFilePath = path.join(dataPath, "users.json");

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const url = urlObj.pathname.replace("/", "");
  if (url === "favicon.ico") {
    res.writeHead(200, {
      "content-type": "image/x-icon",
    });
    res.end();
    return;
  }
  if (url.startsWith("style")) {
    const stylesheetName = url.split("/").pop();
    const stylesheet = fs.readFileSync(
      path.join(styleFilePath, stylesheetName)
    );

    res.writeHead(200, {
      "content-type": "text/css",
    });
    res.end(stylesheet);
    return;
  }
  if (url === "" && req.method === "GET") {
    res.writeHead(200, { "Content-type": "text/html" });

    pug.renderFile(
      path.join(viewPath, "home.pug"),
      { menuItems },
      (err, data) => {
        if (err) throw err;
        res.end(data);
      }
    );
    return;
  }

  if (url === "" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const data = querystring.parse(body);
      if (!data.name?.trim() || !data.birthdate) {
        res.writeHead(400, { "Content-Type": "text/html" });
        pug.renderFile(
          path.join(viewPath, "home.pug"),
          {
            menuItems,
            error: "Merci de remplir tous les champs",
          },
          (err, html) => {
            if (err) throw err;
            res.end(html);
          }
        );
        return;
      }
      let users = [];
      const fileData = fs.readFileSync(usersFilePath, "utf-8");

      if (fileData.trim().length > 0) {
        try {
          users = JSON.parse(fileData);
        } catch (err) {
          console.error(err);
          users = [];
        }
      } else {
        users = [];
      }
      users.push({
        name: data.name,
        birth: formatDate(data.birthdate),
      });

      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
      res.writeHead(200, { "Content-Type": "text/html" });
      pug.renderFile(
        path.join(viewPath, "home.pug"),
        {
          toast: "Votre utilisateur a bien été ajouté!",
          menuItems,
        },
        (err, html) => {
          if (err) throw err;
          res.end(html);
        }
      );
    });
  }

  if (url === "users" && req.method === "GET") {
    let users = [];
    const deleted = urlObj.searchParams.get("deleted");
    let toast;
    if (deleted === "success") {
      toast = "Utilisateur supprimé avec succès !";
    }
    try {
      const fileData = fs.readFileSync(usersFilePath, "utf-8");
      if (fileData.trim()) {
        users = JSON.parse(fileData);
      }
    } catch (err) {
      console.error(err);
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    pug.renderFile(
      path.join(viewPath, "users.pug"),
      { users, menuItems, toast },
      (err, html) => {
        if (err) throw err;
        res.end(html);
      }
    );
    return;
  }

  if (url.startsWith("users/update/") && req.method === "GET") {
    const id = parseInt(url.split("/").pop());

    try {
      const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

      if (!isNaN(id) && users[id]) {
        const user = users[id];

        res.writeHead(200, { "Content-Type": "text/html" });
        pug.renderFile(
          path.join(viewPath, "update.pug"),
          {
            user: { ...user, birth: formatDateForInput(user.birth) },
            id,
            menuItems,
          },
          (err, html) => {
            if (err) throw err;
            res.end(html);
          }
        );
        return;
      }
    } catch (err) {
      console.error(err);
    }

    res.writeHead(302, { Location: "/users" });
    return res.end();
  }

  if (url.startsWith("users/delete/") && req.method === "POST") {
    const id = parseInt(url.split("/").pop());
    try {
      const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      if (!isNaN(id) && users[id]) {
        users.splice(id, 1);
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

        res.writeHead(302, {
          Location: "/users?deleted=success",
        });
        return res.end();
      }
    } catch (err) {
      console.error("Erreur suppression :", err);
    }

    res.writeHead(302, { Location: "/users" });
    return res.end();
  }
  if (url.startsWith("users/update/") && req.method === "POST") {
    const id = parseInt(url.split("/").pop());

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const data = querystring.parse(body);

      if (!data.name?.trim() || !data.birthdate) {
        try {
          const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
          if (!isNaN(id) && users[id]) {
            const user = users[id];
            res.writeHead(200, { "Content-Type": "text/html" });
            pug.renderFile(
              path.join(viewPath, "update.pug"),
              {
                user,
                id,
                menuItems,
                error: "Merci de remplir tous les champs",
              },
              (err, html) => {
                if (err) throw err;
                res.end(html);
              }
            );
            return;
          }
        } catch (err) {
          console.error("Erreur lecture utilisateur :", err);
        }

        res.writeHead(302, { Location: `/users/update/${id}` });
        return res.end();
      }

      try {
        const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

        if (!isNaN(id) && users[id]) {
          users[id].name = data.name;
          users[id].birth = formatDate(data.birthdate);

          fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

          const updatedUser = users[id];
          res.writeHead(200, { "Content-Type": "text/html" });
          pug.renderFile(
            path.join(viewPath, "update.pug"),
            {
              user: updatedUser,
              id,
              menuItems,
              toast: "Utilisateur mis à jour avec succès !",
            },
            (err, html) => {
              if (err) throw err;
              res.end(html);
            }
          );
          return;
        }
      } catch (err) {
        console.error("Erreur mise à jour :", err);
      }

      res.writeHead(302, { Location: "/users" });
      return res.end();
    });
  }
});

server.listen(APP_PORT, APP_HOST, () => {
  console.log(`listening on port: ${APP_PORT}`);
});
