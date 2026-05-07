import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LogsTable } from "@/components/logs/LogsTable";

describe("LogsTable", () => {
  it("paginates log entries with the reports-style controls", async () => {
    const user = userEvent.setup();

    render(<LogsTable />);

    expect(screen.getByText("Showing 1-5 of 7 log entries")).toBeInTheDocument();
    expect(screen.getByText("Scan started for production AWS account.")).toBeInTheDocument();
    expect(screen.queryByText("Evidence export failed for archived IAM snapshot.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next log page" }));

    expect(screen.getByText("Showing 6-7 of 7 log entries")).toBeInTheDocument();
    expect(screen.getByText("Evidence export failed for archived IAM snapshot.")).toBeInTheDocument();
    expect(screen.queryByText("Scan started for production AWS account.")).not.toBeInTheDocument();
  });
});
