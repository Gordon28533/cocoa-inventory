export const STATUS_LABELS = {
  pending:                 "Pending Review",
  branch_account_approved: "Branch Account Approved",
  hod_approved:            "HOD Approved",
  it_approved:             "IT Manager Approved",
  account_approved:        "Account Manager Approved",
  ho_account_approved:     "Head Office Approved",
  fulfilled:               "Fulfilled",
  rejected:                "Rejected"
};

export const getStatusLabel = (status) => STATUS_LABELS[status] || status;
