import { canRegisterFollowUpPurchase } from "@/modules/follow-up/follow-up-permissions";

describe("permisos de compra desde seguimiento", () => {
  it("exige simultáneamente continuidad y dispensación", () => {
    expect(canRegisterFollowUpPurchase("administrator")).toBe(true);
    expect(canRegisterFollowUpPurchase("pharmacist")).toBe(true);
    expect(canRegisterFollowUpPurchase("coordinator")).toBe(false);
    expect(canRegisterFollowUpPurchase("attention")).toBe(false);
  });
});
