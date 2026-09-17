/* Covers the sync race in savedStore.toggle: the store fires one request per
   toggle and only the newest may write back. Requests are deferred promises so
   resolution order is explicit — awaiting each toggle in turn would serialize
   the calls and never exercise the bug. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../api/authApi";
import { useAuthStore } from "./authStore";
import { useToastStore } from "./toastStore";
import { useSavedStore } from "./savedStore";

vi.mock("../api/authApi", () => ({
  authApi: {
    addSaved: vi.fn(),
    removeSaved: vi.fn(),
  },
}));

const addMock = vi.mocked(authApi.addSaved);
const removeMock = vi.mocked(authApi.removeSaved);

/** A request that stays pending until the returned settle/fail is called. */
function deferred(mock: typeof addMock) {
  let settle: (ids: string[]) => void = () => {};
  let fail: (e: Error) => void = () => {};
  mock.mockReturnValueOnce(
    new Promise<string[]>((res, rej) => {
      settle = res;
      fail = rej;
    }),
  );
  return { settle, fail };
}

/** Let queued promise callbacks run. */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  useSavedStore.setState({ ids: [] });
  useAuthStore.setState({ accessToken: "token" });
  useToastStore.getState().hide();
});

describe("savedStore.toggle", () => {
  it("ignores a stale response that lands after a newer one", async () => {
    const a = deferred(addMock);
    useSavedStore.getState().toggle("p1");
    const b = deferred(addMock);
    useSavedStore.getState().toggle("p2");

    b.settle(["p1", "p2"]);
    await flush();
    a.settle(["p1"]); // late reply carrying the older server set
    await flush();

    expect(useSavedStore.getState().ids).toEqual(["p1", "p2"]);
  });

  it("settles on the newest toggle when save/unsave of one id resolve out of order", async () => {
    const add = deferred(addMock);
    useSavedStore.getState().toggle("p1");
    const remove = deferred(removeMock);
    useSavedStore.getState().toggle("p1");

    remove.settle([]);
    await flush();
    add.settle(["p1"]);
    await flush();

    expect(useSavedStore.getState().ids).toEqual([]);
  });

  it("rolls back and toasts when the request fails", async () => {
    const add = deferred(addMock);
    useSavedStore.getState().toggle("p1");
    expect(useSavedStore.getState().ids).toEqual(["p1"]);

    add.fail(new Error("network"));
    await flush();

    expect(useSavedStore.getState().ids).toEqual([]);
    expect(useToastStore.getState().message).toMatch(/couldn't save/i);
  });

  it("ignores a stale failure", async () => {
    const a = deferred(addMock);
    useSavedStore.getState().toggle("p1");
    const b = deferred(addMock);
    useSavedStore.getState().toggle("p2");

    b.settle(["p1", "p2"]);
    await flush();
    a.fail(new Error("network"));
    await flush();

    expect(useSavedStore.getState().ids).toEqual(["p1", "p2"]);
    expect(useToastStore.getState().message).toBeNull();
  });

  it("toggles locally without calling the API when signed out", () => {
    useAuthStore.setState({ accessToken: null });

    expect(useSavedStore.getState().toggle("p1")).toBe(true);

    expect(useSavedStore.getState().ids).toEqual(["p1"]);
    expect(addMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });
});
