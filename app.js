const express = require("express");
const path = require("path");
const { body, validationResult, check } = require("express-validator");
const session = require("express-session");
const prisma = require("./config/prismaClient");
const bcrypt = require("bcryptjs");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const passport = require("./config/passport");

const nameLengthError = "must be between 3 and 10 characters.";
const nameAlphaError = "must contain only letters.";
const passwordSpaceError = "cannot contain whitespaces in the middle.";
const passwordMinLengthError = "must contain at least 7 characters.";

const validateUser = [
  body("firstName")
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage(`First name ${nameLengthError}`)
    .isAlpha()
    .withMessage(`First name ${nameAlphaError}`),
  body("lastName")
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage(`Last name ${nameLengthError}`)
    .isAlpha()
    .withMessage(`Last name ${nameAlphaError}`),
  body("password")
    .trim()
    .isLength({ min: 7 })
    .withMessage(`Password ${passwordMinLengthError}`)
    .custom((value) => !/\s/.test(value))
    .withMessage(`Password ${passwordSpaceError}`),
  check("confirmPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.password
  ),
];

const PORT = 3000;
const app = express();
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    secret: "abracadabra",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", async (request, response) => {
  if (request.user) {
    const foldersOfUser = await prisma.folder.findMany({
      where: {
        ownerId: request.user.id,
      },
    });
    response.render("index", {
      user: request.user,
      folders: foldersOfUser,
    });
  } else {
    response.render("index");
  }
});

app.get("/sign-up", (request, response) => {
  response.render("sign-up-form");
});

app.post("/sign-up", [
  validateUser,
  async (request, response) => {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      response.render("sign-up-form", {
        errors: errors.array(),
      });
    } else {
      const { firstName, lastName, username, password } = request.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const existingUsers = await prisma.user.findMany({
        where: {
          username: username,
          password: hashedPassword,
        },
      });
      if (existingUsers && existingUsers.length > 0) {
        response.render("sign-up-form", {
          errors: [
            {
              msg: "Error. Username or password already exists.",
            },
          ],
        });
      } else {
        await prisma.user.create({
          data: {
            firstName: firstName,
            lastName: lastName,
            username: username,
            password: hashedPassword,
          },
        });
        response.redirect("/");
      }
    }
  },
]);

app.get("/log-in", (request, response) => {
  response.render("log-in-form");
});

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);

app.get("/log-out", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    response.redirect("/");
  });
});

app.get("/create-folder", (request, response) => {
  response.render("createFolder-form");
});

app.post("/create-folder", async (request, response) => {
  const { folderName } = request.body;
  await prisma.folder.create({
    data: {
      name: folderName,
      ownerId: request.user.id,
    },
  });
  response.redirect("/");
});

app.get("/folders/:id/update", async (request, response) => {
  const { id } = request.params;
  const folder = await prisma.folder.findUnique({
    where: {
      id: Number(id),
    },
  });
  response.render("updateFolder-form", {
    folder: folder,
  });
});

app.post("/folders/:id/update", async (request, response) => {
  const { id } = request.params;
  const { folderName } = request.body;
  await prisma.folder.update({
    where: {
      id: Number(id),
    },
    data: {
      name: folderName,
      dateOfModification: new Date(),
    },
  });
  response.redirect("/");
});

app.post("/folders/:id/delete", async (request, response) => {
  const { id } = request.params;
  await prisma.folder.delete({
    where: {
      id: Number(id),
    },
  });
  response.redirect("/");
});

app.get("/folders/:id/files", async (request, response) => {
  const { id } = request.params;
  const { name } = await prisma.folder.findUnique({
    where: {
      id: Number(id),
    },
  });
  const files = await prisma.file.findMany({
    where: {
      folderId: Number(id),
    },
  });
  response.render("files", {
    fileName: name,
  });
});

app.use((error, request, response, next) => {
  console.error(error);
});

app.listen(PORT, () =>
  console.log(`Server was launched: http://localhost:${PORT}/`)
);
