package com.javadaba.contexts.officium.domain;

/**
 * One answer to a card's form, with the question's own words kept beside it: the form can be
 * replaced later and the card must still read as it did.
 *
 * @param value text, a boolean, a number, or a list of strings for a multiple choice
 */
public record AnsweredQuestion(String questionId, String prompt, Object value) {
}
