export const getSavedTheme = () => {
  return localStorage.getItem("theme") || "light";
};

export const applyTheme = (theme) => {
  const isDark = theme === "dark";

  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("theme", theme);

  return isDark;
};