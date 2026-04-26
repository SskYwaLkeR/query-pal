import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChatInput } from "@/components/chat/chat-input";

// ChatInput no longer uses the Button component

describe("ChatInput", () => {
  it("calls onSend with trimmed input when Enter is pressed", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask me anything/i);
    fireEvent.change(textarea, { target: { value: "  How many customers?  " } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).toHaveBeenCalledWith("How many customers?");
  });

  it("clears input after sending", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask me anything/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test query" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(textarea.value).toBe("");
  });

  it("does not send on Shift+Enter (allows newline)", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask me anything/i);
    fireEvent.change(textarea, { target: { value: "line one" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send empty or whitespace-only input", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/ask me anything/i);
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });
});
