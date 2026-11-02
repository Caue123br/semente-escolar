module.exports = {
  initials: (nome) => String(nome).split(/\s+/).map((parte) => parte[0]).join("").slice(0, 2).toUpperCase(),
  cn: (...classes) => classes.filter(Boolean).join(" "),
};
