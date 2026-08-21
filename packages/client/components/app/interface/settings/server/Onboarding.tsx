import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show, createEffect, createSignal } from "solid-js";
import { styled } from "styled-system/jsx";

import MdAdd from "@material-design-icons/svg/outlined/add.svg?component-solid";
import MdDelete from "@material-design-icons/svg/outlined/delete.svg?component-solid";

import { useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import {
  Button,
  Checkbox,
  CircularProgress,
  Column,
  FloatingSelect,
  Form2,
  IconButton,
  MenuItem,
  Row,
  Text,
  TextField,
  iconSize,
} from "@revolt/ui";
import { useMutation, useQuery } from "@tanstack/solid-query";
import { ServerSettingsProps } from "../ServerSettings";

type OnboardingQuestion = {
  id: string;
  prompt: string;
  multiple: boolean;
  options: { id: string; label: string; role_id: string }[];
};

type ServerOnboarding = {
  enabled: boolean;
  title: string;
  message: string;
  rules: string;
  questions: OnboardingQuestion[];
};

const createId = () => crypto.randomUUID();

export default function ServerOnboardingSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const { showError } = useModals();
  const path = () => `/servers/${props.server.id}/onboarding`;
  const settings = useQuery(() => ({
    queryKey: ["server-onboarding", props.server.id],
    queryFn: () =>
      client().api.get(path() as never) as Promise<ServerOnboarding>,
  }));
  const [questions, setQuestions] = createSignal<OnboardingQuestion[]>([]);
  const group = createFormGroup({
    enabled: createFormControl(false),
    title: createFormControl(""),
    message: createFormControl(""),
    rules: createFormControl(""),
    questions: createFormControl("[]"),
  });

  function replaceQuestions(next: OnboardingQuestion[], dirty = true) {
    setQuestions(next);
    group.controls.questions.setValue(JSON.stringify(next));
    group.controls.questions.markDirty(dirty);
  }

  function reset() {
    const value = settings.data;
    group.controls.enabled.setValue(value?.enabled ?? false);
    group.controls.title.setValue(value?.title ?? "");
    group.controls.message.setValue(value?.message ?? "");
    group.controls.rules.setValue(value?.rules ?? "");
    replaceQuestions(value?.questions ?? [], false);
  }

  createEffect(() => {
    if (settings.data && !group.isDirty) reset();
  });

  const save = useMutation(() => ({
    mutationFn: () =>
      client().api.patch(
        path() as never,
        {
          enabled: group.controls.enabled.value,
          title: group.controls.title.value.trim(),
          message: group.controls.message.value.trim(),
          rules: group.controls.rules.value.trim(),
          questions: questions(),
        } as never,
      ),
    onError: showError,
  }));

  function updateQuestion(index: number, patch: Partial<OnboardingQuestion>) {
    replaceQuestions(
      questions().map((question, itemIndex) =>
        itemIndex === index ? { ...question, ...patch } : question,
      ),
    );
  }

  function addOption(questionIndex: number) {
    const question = questions()[questionIndex];
    updateQuestion(questionIndex, {
      options: [
        ...question.options,
        { id: createId(), label: "", role_id: "" },
      ],
    });
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    patch: Partial<OnboardingQuestion["options"][number]>,
  ) {
    const question = questions()[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, itemIndex) =>
        itemIndex === optionIndex ? { ...option, ...patch } : option,
      ),
    });
  }

  const submit = Form2.useSubmitHandler(
    group,
    () => save.mutateAsync().then(() => undefined),
    reset,
  );

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large">
          <Trans>Server onboarding</Trans>
        </Text>
        <Text>
          <Trans>
            Welcome new members, share your rules, and let them choose roles
            before they enter the server.
          </Trans>
        </Text>
      </Column>
      <Show when={!settings.isPending} fallback={<CircularProgress />}>
        <form onSubmit={submit}>
          <Column gap="lg">
            <Form2.Checkbox control={group.controls.enabled}>
              <Trans>Enable server onboarding</Trans>
            </Form2.Checkbox>
            <Form2.TextField
              name="onboarding-title"
              control={group.controls.title}
              label={t`Welcome title`}
              maxlength={80}
            />
            <Form2.TextField
              name="onboarding-message"
              control={group.controls.message}
              label={t`Welcome message`}
              rows={4}
              maxlength={2000}
            />
            <Form2.TextField
              name="onboarding-rules"
              control={group.controls.rules}
              label={t`Server rules (one per line)`}
              rows={6}
              maxlength={5000}
            />

            <Column gap="md">
              <Row style={{ "justify-content": "space-between" }}>
                <Column gap="xs">
                  <Text class="title" size="medium">
                    <Trans>Role questions</Trans>
                  </Text>
                  <Text>
                    <Trans>Help members pick the roles that fit them.</Trans>
                  </Text>
                </Column>
                <Button
                  type="button"
                  variant="tonal"
                  onPress={() =>
                    replaceQuestions([
                      ...questions(),
                      {
                        id: createId(),
                        prompt: "",
                        multiple: false,
                        options: [],
                      },
                    ])
                  }
                >
                  <MdAdd {...iconSize(18)} /> <Trans>Add question</Trans>
                </Button>
              </Row>

              <Show
                when={questions().length}
                fallback={
                  <EmptyState>
                    <Text>
                      <Trans>
                        No questions yet. Add one if members should choose roles
                        during onboarding.
                      </Trans>
                    </Text>
                  </EmptyState>
                }
              >
                <For each={questions()}>
                  {(question, questionIndex) => (
                    <QuestionCard>
                      <Column gap="md">
                        <Row style={{ "justify-content": "space-between" }}>
                          <Text class="title" size="small">
                            <Trans>Question {questionIndex() + 1}</Trans>
                          </Text>
                          <IconButton
                            type="button"
                            aria-label={t`Delete question`}
                            onPress={() =>
                              replaceQuestions(
                                questions().filter(
                                  (_, index) => index !== questionIndex(),
                                ),
                              )
                            }
                          >
                            <MdDelete {...iconSize(20)} />
                          </IconButton>
                        </Row>
                        <TextField
                          label={t`Question`}
                          placeholder={t`Which topics are you interested in?`}
                          value={question.prompt}
                          maxlength={200}
                          required
                          oninput={(event) =>
                            updateQuestion(questionIndex(), {
                              prompt: event.currentTarget.value,
                            })
                          }
                        />
                        <Checkbox
                          checked={question.multiple}
                          onChange={(event) =>
                            updateQuestion(questionIndex(), {
                              multiple: event.currentTarget.checked,
                            })
                          }
                        >
                          <Trans>
                            Allow members to choose more than one answer
                          </Trans>
                        </Checkbox>
                        <Column gap="sm">
                          <For each={question.options}>
                            {(option, optionIndex) => (
                              <OptionRow>
                                <TextField
                                  label={t`Answer`}
                                  placeholder={t`Announcements`}
                                  value={option.label}
                                  maxlength={100}
                                  required
                                  oninput={(event) =>
                                    updateOption(
                                      questionIndex(),
                                      optionIndex(),
                                      { label: event.currentTarget.value },
                                    )
                                  }
                                />
                                <FloatingSelect
                                  label={t`Role to assign`}
                                  value={option.role_id}
                                  required
                                  onChange={(event) =>
                                    updateOption(
                                      questionIndex(),
                                      optionIndex(),
                                      { role_id: event.currentTarget.value },
                                    )
                                  }
                                >
                                  <MenuItem value="">
                                    <Trans>Choose a role</Trans>
                                  </MenuItem>
                                  <For each={props.server.orderedRoles}>
                                    {(role) => (
                                      <MenuItem value={role.id}>
                                        {role.name}
                                      </MenuItem>
                                    )}
                                  </For>
                                </FloatingSelect>
                                <IconButton
                                  type="button"
                                  aria-label={t`Delete answer`}
                                  onPress={() =>
                                    updateQuestion(questionIndex(), {
                                      options: question.options.filter(
                                        (_, index) => index !== optionIndex(),
                                      ),
                                    })
                                  }
                                >
                                  <MdDelete {...iconSize(20)} />
                                </IconButton>
                              </OptionRow>
                            )}
                          </For>
                          <Button
                            type="button"
                            variant="outlined"
                            onPress={() => addOption(questionIndex())}
                          >
                            <MdAdd {...iconSize(18)} />{" "}
                            <Trans>Add answer</Trans>
                          </Button>
                        </Column>
                      </Column>
                    </QuestionCard>
                  )}
                </For>
              </Show>
            </Column>

            <Row>
              <Form2.Reset group={group} onReset={reset} />
              <Form2.Submit group={group} requireDirty>
                <Trans>Save</Trans>
              </Form2.Submit>
              <Show when={save.isPending}>
                <CircularProgress />
              </Show>
            </Row>
          </Column>
        </form>
      </Show>
    </Column>
  );
}

const QuestionCard = styled("section", {
  base: {
    padding: "var(--gap-lg)",
    border: "1px solid var(--md-sys-color-outline-variant)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container-low)",
  },
});
const EmptyState = styled("div", {
  base: {
    padding: "var(--gap-lg)",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-container)",
  },
});
const OptionRow = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
    gap: "var(--gap-sm)",
    alignItems: "center",
    smDown: {
      gridTemplateColumns: "1fr auto",
      "& > :nth-child(2)": { gridColumn: "1" },
    },
  },
});
