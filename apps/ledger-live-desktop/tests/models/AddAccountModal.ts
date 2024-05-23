import { Locator, Page } from "@playwright/test";
import { Modal } from "./Modal";

export class AddAccountModal extends Modal {
  readonly page: Page;
  readonly selectAccount: Locator;
  readonly selectAccountInput: Locator;
  readonly addAccountsButton: Locator;
  readonly stopButton: Locator;
  readonly retryButton: Locator;
  readonly addMoreButton: Locator;
  readonly doneButton: Locator;
  readonly accountsList: Locator;
  readonly successAddLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.selectAccount = page.locator("text=Choose a crypto asset"); // FIXME: I need an id
    this.selectAccountInput = page.locator('[placeholder="Search"]'); // FIXME: I need an id
    this.addAccountsButton = page.locator("data-test-id=add-accounts-import-add-button");
    this.accountsList = page.locator("data-test-id=add-accounts-step-import-accounts-list");
    this.retryButton = page.locator("data-test-id=add-accounts-import-retry-button");
    this.stopButton = page.locator("data-test-id=add-accounts-import-stop-button");
    this.addMoreButton = page.locator("data-test-id=add-accounts-finish-add-more-button");
    this.doneButton = page.locator("data-test-id=add-accounts-finish-close-button");
    this.successAddLabel = page.locator("text=Account added successfully");
  }

  async select(currency: string) {
    await this.selectAccount.click();
    await this.selectAccountInput.fill(currency);
    await this.selectAccountInput.press("Enter");
  }

  async addAccounts() {
    await this.addAccountsButton.click();
  }

  async getFirstAccountName() {
    await this.page.waitForTimeout(500);
    return await this.accountsList.locator("input").first().inputValue();
  }

  async done() {
    await this.doneButton.click();
  }

  async waitForSync() {
    await this.stopButton.waitFor({ state: "hidden" });
    await this.addAccountsButton.waitFor({ state: "visible" });
  }
}
