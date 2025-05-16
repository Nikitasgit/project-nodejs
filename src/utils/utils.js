import moment from "moment";

export const formatDate = (date) => {
  return moment(date).format("YYYY-DD-MM");
};

export const formatDateForInput = (date) => {
  return moment(date, "YYYY-DD-MM").format("YYYY-MM-DD");
};
