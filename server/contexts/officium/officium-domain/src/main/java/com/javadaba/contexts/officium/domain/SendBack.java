package com.javadaba.contexts.officium.domain;

/**
 * What a send-back writes with the move itself (card://JAVA-1416), in the move's one transaction: its
 * {@link ReviewReturn} entry and the findings comment the entry links to.
 */
public record SendBack(ReviewReturn entry, CardComment findings) {
}
