import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import type { ReviewSummary } from "@/entities/handover";
import { useHandoverRepository } from "@/entities/handover";
import { Badge } from "@/shared/ui/badge";
import { Icon } from "@/shared/ui/icon";

import styles from "./ReviewInboxPage.module.css";

type Filter = "pending" | "approved";
const tabs: Array<{ filter: Filter; label: string }> = [
  { filter: "pending", label: "승인 대기" },
  { filter: "approved", label: "승인 완료" },
];
const matches = (item: ReviewSummary, filter: Filter) =>
  filter === "pending"
    ? item.status === "submitted"
    : item.status === "approved";

export function ReviewInboxPage() {
  const repository = useHandoverRepository();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const requested = params.get("status");
  const filter: Filter = tabs.some((tab) => tab.filter === requested)
    ? (requested as Filter)
    : "pending";
  useEffect(() => {
    let ignore = false;
    repository.listReviews().then((items) => {
      if (!ignore) setReviews(items);
    });
    return () => {
      ignore = true;
    };
  }, [repository]);
  const visible = reviews?.filter((item) => matches(item, filter)) ?? [];
  const countOf = (target: Filter) =>
    reviews?.filter((item) => matches(item, target)).length ?? 0;
  return (
    <>
      <button
        className={styles.homeBack}
        type="button"
        onClick={() => navigate("/")}
      >
        <Icon name="back" /> 홈으로
      </button>
      <main className={styles.main}>
        <header>
          <div>
            <span>
              <Icon name="check" /> 인수인계 확인하기
            </span>
            <h1>검토할 인수인계</h1>
            <p>제출된 문서를 확인하고 승인하거나 피드백을 남기세요.</p>
          </div>
          <div className={styles.pendingCount}>
            <strong>{countOf("pending")}</strong>
            <span>승인 대기</span>
          </div>
        </header>
        {reviews ? (
          <>
            <nav aria-label="검토 상태 필터">
              {tabs.map((tab) => (
                <button
                  aria-pressed={filter === tab.filter}
                  key={tab.filter}
                  type="button"
                  onClick={() => setParams({ status: tab.filter })}
                >
                  {tab.label} {countOf(tab.filter)}
                </button>
              ))}
            </nav>
            <section aria-label="검토할 인수인계 목록" className={styles.list}>
              {visible.map((review) => (
                <article key={review.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/reviews/${review.id}`)}
                  >
                    <Badge tone={review.tone}>{review.statusLabel}</Badge>
                    <span className={styles.copy}>
                      <strong>{review.title}</strong>
                      <small>
                        {review.from} · {review.team}
                      </small>
                    </span>
                    <span className={styles.meta}>
                      <small>
                        업무 {review.tasks}개 · 첨부 {review.files}개
                      </small>
                      <time>{review.date}</time>
                    </span>
                    <Icon name="chevron" />
                  </button>
                </article>
              ))}
            </section>
          </>
        ) : (
          <div className={styles.loading}>검토 목록을 불러오고 있어요…</div>
        )}
      </main>
    </>
  );
}
