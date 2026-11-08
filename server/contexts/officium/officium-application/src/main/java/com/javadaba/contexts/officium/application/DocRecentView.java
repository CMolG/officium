package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

import java.time.Instant;

/** A page the caller opened, as a summary plus when (JAVA-799, contract §8.21). */
public record DocRecentView(@JsonUnwrapped DocPageView.Summary page, Instant viewedAt) {
}
