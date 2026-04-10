import { useEffect } from "react";

const APP_NAME = "CMC Inventory";

const buildDocumentTitle = (pageTitle) => {
  const normalizedTitle = String(pageTitle || "").trim();

  if (!normalizedTitle) {
    return APP_NAME;
  }

  return `${normalizedTitle} | ${APP_NAME}`;
};

const useDocumentTitle = (pageTitle) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = buildDocumentTitle(pageTitle);

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);
};

export default useDocumentTitle;
