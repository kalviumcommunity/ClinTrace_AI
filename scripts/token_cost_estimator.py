"""Count sample tokens and estimate model input/output cost."""

from dataclasses import dataclass

import tiktoken


INPUT_PRICE_PER_1K = 0.0005
OUTPUT_PRICE_PER_1K = 0.0015
ENCODING_NAME = "cl100k_base"


@dataclass(frozen=True)
class Sample:
    name: str
    input_text: str
    output_text: str


SAMPLES = (
    Sample(
        name="short question",
        input_text="What is the patient's current risk level?",
        output_text="The current risk level is high.",
    ),
    Sample(
        name="clinical paragraph",
        input_text=(
            "The intake record contains a recent diagnosis, medication history, "
            "and follow-up recommendation. Validate required fields before the "
            "record is sent to the retrieval pipeline."
        ),
        output_text=(
            "The record is suitable for retrieval after the required fields are "
            "validated and the medication history is normalized."
        ),
    ),
    Sample(
        name="full workflow document",
        input_text=(
            "ClinTrace AI processes clinical documents in several stages. First, "
            "the intake service checks file type, encoding, required fields, and "
            "data quality. Next, documents are divided into retrieval-friendly "
            "chunks and indexed for question answering. At query time, the system "
            "retrieves the most relevant chunks, places them in the model context, "
            "and records token usage. Tracking input and output tokens helps the "
            "team estimate cost, stay below the model context limit, and choose "
            "appropriate chunk sizes and retrieval values."
        ),
        output_text=(
            "The workflow validates and indexes the documents, retrieves relevant "
            "context, and measures usage so cost and context limits remain visible."
        ),
    ),
)


def count_tokens(encoder: tiktoken.Encoding, text: str) -> int:
    return len(encoder.encode(text))


def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    input_cost = input_tokens / 1_000 * INPUT_PRICE_PER_1K
    output_cost = output_tokens / 1_000 * OUTPUT_PRICE_PER_1K
    return input_cost + output_cost


def main() -> None:
    encoder = tiktoken.get_encoding(ENCODING_NAME)
    total_input_tokens = 0
    total_output_tokens = 0

    print(f"Tokenizer: {ENCODING_NAME}")
    print(
        f"Rates: input=${INPUT_PRICE_PER_1K:.4f}/1K tokens, "
        f"output=${OUTPUT_PRICE_PER_1K:.4f}/1K tokens"
    )
    print()

    for sample in SAMPLES:
        input_tokens = count_tokens(encoder, sample.input_text)
        output_tokens = count_tokens(encoder, sample.output_text)
        input_chars = len(sample.input_text)
        input_words = len(sample.input_text.split())
        total_input_tokens += input_tokens
        total_output_tokens += output_tokens

        print(sample.name)
        print(
            f"  input: chars={input_chars}, words={input_words}, "
            f"tokens={input_tokens}"
        )
        print(f"  output: tokens={output_tokens}")
        print(f"  input token/char ratio={input_tokens / input_chars:.3f}")
        print(f"  estimated cost=${estimate_cost(input_tokens, output_tokens):.6f}")
        print()

    total_cost = estimate_cost(total_input_tokens, total_output_tokens)
    print("Corpus total")
    print(f"  input tokens={total_input_tokens}")
    print(f"  output tokens={total_output_tokens}")
    print(f"  estimated cost=${total_cost:.6f}")
    print()
    print(
        "Token counts follow text length, but are not proportional: the tokenizer "
        "splits punctuation, long words, code, and non-English text differently."
    )


if __name__ == "__main__":
    main()