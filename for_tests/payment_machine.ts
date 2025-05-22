import { createMachine, assign } from "xstate";

export const machine = createMachine({
  context: initialContext,
  id: "payment",
  initial: "idle",
  on: {
    "*": {
      actions: {
        type: "logGenericEvent",
      },
    },
  },
  states: {
    idle: {
      on: {
        START_CHECKOUT: {
          target: "loadingPaymentPrerequisites",
          actions: assign({
            orderId: (_, event) => event.orderId,
            userId: (_, event) => event.userId,
            totalAmount: (_, event) => event.totalAmount,
            amountToPay: (_, event) => event.totalAmount,
            userEmail: (_, event) => event.userEmail,
            isLoading: true,
            attemptCount: 0,
            error: undefined,
            paymentStatusForAdmin: "Ожидает оплаты",
            selectedPaymentMethod: undefined,
            cardDetails: initialContext.cardDetails,
            useBenefits: false,
            benefitDetails: undefined,
            receipt: initialContext.receipt,
          }),
        },
      },
    },
    loadingPaymentPrerequisites: {
      entry: {
        type: "logPaymentInitiation",
      },
      invoke: {
        id: "fetchPrerequisites",
        input: {},
        onDone: {
          target: "selectingPaymentOptions",
          actions: [
