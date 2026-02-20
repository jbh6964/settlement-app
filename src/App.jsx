import { useEffect, useMemo, useState } from "react";

const EXTRA_TOTAL = 10000;
const money = (n) => (isFinite(n) ? Math.round(n).toLocaleString("ko-KR") : "0");
const roundTo10 = (n) => Math.round(n / 10) * 10;

// 드롭다운 화살표 커스텀
const CHEVRON_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
  <path d="M4 6l4 4 4-4" stroke="rgba(255,255,255,0.85)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`);
const CHEVRON_BG = `url("data:image/svg+xml,${CHEVRON_SVG}")`;

function parseNamesCommaOnly(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseAmount(input) {
  if (input == null) return 0;
  let s = String(input).trim();
  if (!s) return 0;

  s = s.replace(/원/g, "");
  s = s.replace(/[,\s]/g, "");

  if (/^\d+$/.test(s)) return Number(s);

  if (s.includes("만")) {
    const [aRaw, bRaw = ""] = s.split("만");
    const a = aRaw ? Number(aRaw) : 0;
    const b = bRaw ? Number(bRaw) : 0;
    if (!isFinite(a) || !isFinite(b)) return 0;
    return a * 10000 + b;
  }

  const digits = s.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export default function App() {
  const [nameText, setNameText] = useState("");
  const [participants, setParticipants] = useState([]);

  const [leaderName, setLeaderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [benefitMap, setBenefitMap] = useState({});
  const [rounds, setRounds] = useState([{ id: 1, title: "1차", amountText: "", payer: "", selected: {} }]);

  const [benefitOn, setBenefitOn] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("settlement_v13") || "{}");
      if (saved.participants) setParticipants(saved.participants);
      if (saved.leaderName) setLeaderName(saved.leaderName);
      if (saved.bankName) setBankName(saved.bankName);
      if (saved.accountNumber) setAccountNumber(saved.accountNumber);
      if (saved.benefitMap) setBenefitMap(saved.benefitMap);
      if (saved.rounds) setRounds(saved.rounds);
      if (typeof saved.benefitOn === "boolean") setBenefitOn(saved.benefitOn);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "settlement_v13",
      JSON.stringify({
        participants,
        leaderName,
        bankName,
        accountNumber,
        benefitMap,
        rounds,
        benefitOn,
      })
    );
  }, [participants, leaderName, bankName, accountNumber, benefitMap, rounds, benefitOn]);

  const names = useMemo(() => {
    const uniq = [];
    const seen = new Set();
    for (const p of participants) {
      const x = String(p || "").trim();
      if (!x) continue;
      const key = x.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(x);
    }
    return uniq;
  }, [participants]);

  const canUseBenefit = names.length >= 6;

  useEffect(() => {
    if (!canUseBenefit && benefitOn) setBenefitOn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseBenefit]);

  const applyNames = () => {
    const tokens = parseNamesCommaOnly(nameText);
    setParticipants(tokens);
    setResult(null);

    const nextBenefit = {};
    tokens.forEach((n) => (nextBenefit[n] = "O"));
    for (const n of tokens) if (benefitMap?.[n] === "X") nextBenefit[n] = "X";

    const nextLeader = leaderName && tokens.includes(leaderName) ? leaderName : tokens[0] || "";
    if (nextLeader) nextBenefit[nextLeader] = "X";

    setLeaderName(nextLeader);
    setBenefitMap(nextBenefit);

    setRounds((prev) =>
      prev.map((r) => {
        const selected = {};
        tokens.forEach((n) => (selected[n] = true));
        if (r.selected) for (const n of tokens) if (typeof r.selected[n] === "boolean") selected[n] = r.selected[n];
        const payer = r.payer && tokens.includes(r.payer) ? r.payer : tokens[0] || "";
        return { ...r, selected, payer };
      })
    );
  };

  const onChangeLeader = (newLeader) => {
    setLeaderName(newLeader);
    setResult(null);
    if (!newLeader) return;
    setBenefitMap((prev) => ({ ...prev, [newLeader]: "X" }));
  };

  const setBenefitFor = (name, v) => {
    if (name === leaderName) {
      setBenefitMap((prev) => ({ ...prev, [name]: "X" }));
      return;
    }
    setBenefitMap((prev) => ({ ...prev, [name]: v }));
    setResult(null);
  };

  const addRound = () => {
    const nextId = Math.max(...rounds.map((r) => r.id)) + 1;
    const selected = {};
    names.forEach((n) => (selected[n] = true));
    setRounds([...rounds, { id: nextId, title: `${rounds.length + 1}차`, amountText: "", payer: names[0] || "", selected }]);
    setResult(null);
  };

  const removeRound = (id) => {
    if (rounds.length === 1) return;
    setRounds(rounds.filter((r) => r.id !== id));
    setResult(null);
  };

  const updateRound = (id, patch) => {
    setRounds(rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setResult(null);
  };

  const toggleRoundParticipant = (roundId, name) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== roundId) return r;
        const selected = { ...(r.selected || {}) };
        selected[name] = !selected[name];
        return { ...r, selected };
      })
    );
    setResult(null);
  };

  const setRoundAll = (roundId, value) => {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== roundId) return r;
        const selected = {};
        names.forEach((n) => (selected[n] = value));
        return { ...r, selected };
      })
    );
    setResult(null);
  };

  const validate = () => {
    const issues = [];
    if (names.length === 0) issues.push("참가자를 입력하고 ‘이름 적용하기’를 눌러줘.");
    if (!leaderName) issues.push("벙주를 선택해줘.");
    if (benefitOn && !canUseBenefit) issues.push("베네핏은 참가자 6명 이상일 때만 적용 가능해.");
    if (!bankName.trim()) issues.push("은행명을 입력해줘.");
    if (!accountNumber.trim()) issues.push("계좌번호를 입력해줘.");

    const hasAnyAmount = rounds.some((r) => parseAmount(r.amountText) > 0);
    if (!hasAnyAmount) issues.push("최소 1개 차수의 금액을 입력해줘.");

    rounds.forEach((r) => {
      const amt = parseAmount(r.amountText);
      if (amt <= 0) return;

      const selected = r.selected || {};
      const roundPeople = names.filter((n) => selected[n] === true);
      if (roundPeople.length === 0) issues.push(`${r.title}: 참여자가 0명이야. 참여자 체크해줘.`);
      if (!r.payer) issues.push(`${r.title}: 결제자를 선택해줘.`);
      if (r.payer && !names.includes(r.payer)) issues.push(`${r.title}: 결제자가 참가자 목록에 없어.`);
    });

    if (canUseBenefit && benefitOn) {
      const benefitPeople = names.filter((n) => (benefitMap?.[n] || "O") === "O");
      if (benefitPeople.length === 0) issues.push("베네핏 대상(O) 인원이 0명이야. 최소 1명은 O여야 해.");
    }

    if (leaderName && (benefitMap?.[leaderName] || "O") !== "X") {
      issues.push("벙주는 베네핏 대상이 될 수 없어. (자동으로 X 처리됨)");
      setBenefitMap((prev) => ({ ...prev, [leaderName]: "X" }));
    }

    return issues;
  };

  const calc = () => {
    const issues = validate();
    if (issues.length) {
      alert("확인 필요:\n- " + issues.slice(0, 10).join("\n- ") + (issues.length > 10 ? "\n- …" : ""));
      return;
    }

    // 1) 차수별 1/N 분배(원본)
    const perByItem = {};
    names.forEach((n) => (perByItem[n] = {}));

    const roundTotals = {};
    const paidByPerson = {};
    names.forEach((n) => (paidByPerson[n] = 0));

    for (const r of rounds) {
      const amt = parseAmount(r.amountText);
      if (amt <= 0) continue;

      roundTotals[r.title] = { amount: amt, payer: r.payer || "" };
      if (r.payer) paidByPerson[r.payer] = (paidByPerson[r.payer] || 0) + amt;

      const selected = r.selected || {};
      const roundPeople = names.filter((n) => selected[n] === true);
      const share = amt / roundPeople.length;

      roundPeople.forEach((n) => {
        perByItem[n][r.title] = (perByItem[n][r.title] || 0) + share;
      });
    }

    // 2) 베네핏 1만원 추가 분담(원본)
    let benefitApplied = false;
    if (canUseBenefit && benefitOn) {
      const benefitPeople = names.filter((n) => (benefitMap?.[n] || "O") === "O");
      const extraEach = EXTRA_TOTAL / benefitPeople.length;
      benefitPeople.forEach((n) => {
        perByItem[n]["베네핏"] = (perByItem[n]["베네핏"] || 0) + extraEach;
      });
      benefitApplied = true;
    }

    // 3) 10원 단위 반올림(항목별)
    const perByItemRounded = {};
    const perOwedTotal = {}; // 정산금액(본인 부담) = 반올림된 차수합 + 베네핏 + 보정
    names.forEach((n) => {
      perByItemRounded[n] = {};
      let sum = 0;
      for (const [k, v] of Object.entries(perByItem[n])) {
        const rv = roundTo10(v);
        perByItemRounded[n][k] = rv;
        sum += rv;
      }
      perOwedTotal[n] = sum;
    });

    // 4) 전체 합(차수합 + 베네핏)이 정확히 맞도록 diff를 벙주에게 보정
    const totalBaseRaw = rounds.reduce((acc, r) => acc + parseAmount(r.amountText), 0); // ✅ 차수 금액 합(베네핏 제외)
    const totalBenefit = benefitApplied ? EXTRA_TOTAL : 0;
    const targetTotal = totalBaseRaw + totalBenefit; // 내부 정산 검증용(총합)

    const sumRounded = names.reduce((acc, n) => acc + (perOwedTotal[n] || 0), 0);
    const diff = targetTotal - sumRounded;

    if (diff !== 0) {
      const leader = leaderName && names.includes(leaderName) ? leaderName : names[0];
      perByItemRounded[leader]["반올림 보정"] = (perByItemRounded[leader]["반올림 보정"] || 0) + diff;
      perOwedTotal[leader] = (perOwedTotal[leader] || 0) + diff;
    }

    // 5) 최종 입금/환급 = 정산금액(본인부담) - 선결제
    const finalDelta = {};
    names.forEach((n) => {
      finalDelta[n] = (perOwedTotal[n] || 0) - (paidByPerson[n] || 0);
    });

    setResult({
      roundTotals,
      totalBase: totalBaseRaw, // ✅ 카톡 "총액"은 이 값 사용(차수 합만)
      totalBenefit,
      totalAll: targetTotal, // 내부 계산/검증용
      benefitApplied,
      perByItem: perByItemRounded,
      perOwedTotal,
      paidByPerson,
      finalDelta,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      leaderName,
    });
  };

  /**
   * ✅ 카톡 템플릿 규칙(최종)
   * - 상단 '총액' = 차수 금액 합만 (베네핏 제외)
   * - '베네핏'은 별도 라인
   * - 참여자 블록: 총액 라인 없음
   * - 선결제 있는 사람: 정산 금액 = (정산금액 - 선결제)
   * - 선결제 라인은 (벙주 제외) + (선결제 > 0일 때만)
   * - ✅ 벙주(leaderName)는 참여자 블록 자체를 미노출
   */
  const copyKakao = async () => {
    if (!result) return;

    const roundTitles = Object.keys(result.roundTotals);

    const lines = [];
    lines.push("정산 결과");
    roundTitles.forEach((t) => lines.push(`${t} : ${money(result.roundTotals[t].amount)}원`));
    lines.push(`총액 : ${money(result.totalBase)}원`);
    lines.push(`베네핏 : ${money(result.totalBenefit)}원`);
    lines.push("");
    lines.push("");

    for (const n of names) {
      if (n === result.leaderName) continue; // ✅ 벙주 미노출

      const items = result.perByItem[n] || {};
      const owed = result.perOwedTotal[n] || 0;
      const paid = result.paidByPerson[n] || 0;
      const settleForKakao = paid > 0 ? owed - paid : owed;

      lines.push(`${n}`);
      roundTitles.forEach((t) => lines.push(`${t} : ${money(items[t] || 0)}원`));
      lines.push(`베네핏 : ${money(items["베네핏"] || 0)}원`);

      if (paid > 0) {
        lines.push(`선결제 : ${money(paid)}원`);
      }

      lines.push(`정산 금액 : ${money(settleForKakao)}원`);
      lines.push("");
      lines.push("");
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("카톡용 정산 텍스트를 복사했어. (벙주 블록 제외)");
    } catch {
      alert("복사 실패. 브라우저 권한을 확인해줘.");
    }
  };

  const copySimple = async () => {
    if (!result) return;
    const lines = [];
    lines.push(`정산 결과 (차수합: ${money(result.totalBase)}원 / 베네핏: ${money(result.totalBenefit)}원)`);
    lines.push(`입금: ${result.bankName} ${result.accountNumber} (벙주: ${result.leaderName})`);
    lines.push("");
    for (const n of names) {
      const owed = result.perOwedTotal[n] || 0;
      const paid = result.paidByPerson[n] || 0;
      const delta = result.finalDelta[n] || 0;
      lines.push(`- ${n}: 정산 ${money(owed)}원 / 선결제 ${money(paid)}원 / (정산-선결제) ${money(delta)}원`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("결과를 복사했어.");
    } catch {
      alert("복사 실패. 브라우저 권한을 확인해줘.");
    }
  };

  return (
    <div style={ui.page}>
      <div style={ui.card}>
        <div style={ui.header}>
          <div>
            <div style={ui.h1}>정산 계산기</div>
            <div style={ui.sub}>
              참가자 입력: <b>이름, 이름, 이름</b>
            </div>
          </div>
        </div>

        <section style={ui.section}>
          <div style={ui.sectionTitle}>참가자</div>
          <textarea
            style={ui.textarea}
            rows={3}
            placeholder={"예) 병하, 주영, 경희, 창우"}
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
          />
          <button style={ui.primaryBtn} onClick={applyNames}>
            이름 적용하기
          </button>

          {names.length > 0 && (
            <div style={ui.chipRow}>
              {names.map((n) => (
                <span key={n} style={ui.chip}>
                  {n}
                </span>
              ))}
            </div>
          )}
        </section>

        <section style={ui.section}>
          <div style={ui.sectionTitle}>벙주 / 입금 정보</div>

          <div style={ui.grid}>
            <div style={ui.field}>
              <div style={ui.label}>벙주</div>
              <select
                style={ui.select}
                value={leaderName}
                onChange={(e) => onChangeLeader(e.target.value)}
                disabled={names.length === 0}
              >
                <option value="">선택</option>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div style={ui.field}>
              <div style={ui.label}>은행</div>
              <input
                style={ui.input}
                placeholder="예) 국민, 신한, 카카오"
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  setResult(null);
                }}
              />
            </div>

            <div style={ui.field}>
              <div style={ui.label}>계좌번호</div>
              <input
                style={ui.input}
                placeholder="예) 123-456-7890"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  setResult(null);
                }}
              />
            </div>
          </div>
        </section>

        <section style={ui.section}>
          <div style={ui.sectionTitle}>베네핏 대상</div>

          <div style={ui.helper}>
            기본값은 전원 <b>O</b>. 벙주는 자동 <b>X</b>. (6명 이상일 때만 베네핏 적용 가능)
          </div>
          <div style={ui.warnText}>운영진은 'X' 적용해주세요</div>

          <label style={ui.toggle}>
            <input
              type="checkbox"
              checked={benefitOn}
              onChange={(e) => {
                setBenefitOn(e.target.checked);
                setResult(null);
              }}
              disabled={!canUseBenefit}
            />
            <span>베네핏 1만원 추가 분담 적용</span>
          </label>
          {!canUseBenefit && <div style={ui.helper}>참가자 6명 이상일 때만 활성화</div>}

          {names.length > 0 && (
            <div style={ui.list}>
              {names.map((n) => {
                const isLeader = n === leaderName;
                const val = isLeader ? "X" : benefitMap?.[n] || "O";
                return (
                  <div key={n} style={ui.listRow}>
                    <div style={ui.listName}>
                      {n} {isLeader ? <span style={ui.badge}>벙주</span> : null}
                    </div>
                    <select
                      style={ui.smallSelect}
                      value={val}
                      onChange={(e) => setBenefitFor(n, e.target.value)}
                      disabled={isLeader}
                    >
                      <option value="O">O</option>
                      <option value="X">X</option>
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={ui.section}>
          <div style={ui.sectionTitle}>차수</div>

          {rounds.map((r) => (
            <div key={r.id} style={ui.roundCard}>
              <div style={ui.roundHeader}>
                <div style={ui.roundTitle}>{r.title}</div>

                {rounds.length > 1 && (
                  <button style={ui.closeBtn} onClick={() => removeRound(r.id)} aria-label="remove" title="차수 삭제">
                    ×
                  </button>
                )}
              </div>

              <div style={ui.grid}>
                <div style={ui.field}>
                  <div style={ui.label}>금액</div>
                  <input
                    style={ui.input}
                    placeholder="예) 10만 / 100000 / 10,000 / 10 000"
                    value={r.amountText}
                    onChange={(e) => updateRound(r.id, { amountText: e.target.value })}
                  />
                  <div style={ui.helper}>
                    인식 예: <b>10만</b>, <b>10,000</b>, <b>10 000</b>
                  </div>
                </div>

                <div style={ui.field}>
                  <div style={ui.label}>결제자(선결제자)</div>
                  <select
                    style={ui.select}
                    value={r.payer || ""}
                    onChange={(e) => updateRound(r.id, { payer: e.target.value })}
                    disabled={names.length === 0}
                  >
                    <option value="">선택</option>
                    {names.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={ui.roundTools}>
                  <div style={ui.label}>참여자 선택</div>
                  <div style={ui.inlineBtns}>
                    <button style={ui.tinyBtn} onClick={() => setRoundAll(r.id, true)}>
                      전체
                    </button>
                    <button style={ui.tinyBtn} onClick={() => setRoundAll(r.id, false)}>
                      해제
                    </button>
                  </div>
                </div>

                {names.length === 0 ? (
                  <div style={ui.helper}>참가자를 먼저 적용해줘.</div>
                ) : (
                  <div style={ui.checkGrid}>
                    {names.map((n) => (
                      <label key={n} style={ui.checkItem}>
                        <input type="checkbox" checked={r.selected?.[n] === true} onChange={() => toggleRoundParticipant(r.id, n)} />
                        <span>{n}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button style={ui.secondaryBtn} onClick={addRound}>
            + 차수 추가
          </button>
          <button style={ui.primaryBtn} onClick={calc}>
            정산 계산하기
          </button>
        </section>

        {result && (
          <section style={ui.section}>
            <div style={ui.sectionTitle}>정산 결과</div>

            <div style={ui.resultBox}>
              <div style={ui.totalLine}>
                차수 합 : <b>{money(result.totalBase)}원</b>
              </div>
              <div style={ui.helper}>
                베네핏(별도): <b>{money(result.totalBenefit)}원</b>
              </div>
              <div style={ui.helper}>
                반올림: <b>10원 단위</b> / 오차는 <b>벙주 보정</b>
              </div>
              <div style={ui.helper}>
                입금: <b>{result.bankName}</b> {result.accountNumber} (벙주: {result.leaderName})
              </div>

              <div style={ui.btnRow}>
                <button style={ui.secondaryBtn} onClick={copySimple}>
                  결과 복사(간단)
                </button>
                <button style={ui.primaryBtn} onClick={copyKakao}>
                  카톡용 복사 (벙주 제외)
                </button>
              </div>
            </div>

            <div style={ui.personList}>
              {names.map((n) => {
                const items = result.perByItem[n] || {};
                const roundTitles = Object.keys(result.roundTotals);
                const owed = result.perOwedTotal[n] || 0;
                const paid = result.paidByPerson[n] || 0;
                const delta = result.finalDelta[n] || 0;

                return (
                  <div key={n} style={ui.personCard}>
                    <div style={ui.personHeader}>
                      <div style={ui.personName}>
                        {n} {n === result.leaderName ? <span style={ui.badge}>벙주</span> : null}
                      </div>
                      <div style={ui.personTotal}>{money(owed)}원</div>
                    </div>

                    <div style={ui.personItems}>
                      {roundTitles.map((t) => (
                        <div key={t} style={ui.itemRow}>
                          <div style={ui.itemKey}>{t}</div>
                          <div style={ui.itemVal}>{money(items[t] || 0)}원</div>
                        </div>
                      ))}
                      <div style={ui.itemRow}>
                        <div style={ui.itemKey}>베네핏</div>
                        <div style={ui.itemVal}>{money(items["베네핏"] || 0)}원</div>
                      </div>
                      {items["반올림 보정"] ? (
                        <div style={ui.itemRow}>
                          <div style={ui.itemKey}>반올림 보정</div>
                          <div style={ui.itemVal}>{money(items["반올림 보정"])}원</div>
                        </div>
                      ) : null}

                      <div style={ui.hr} />

                      <div style={ui.itemRow}>
                        <div style={ui.itemKey}>정산 금액(본인 부담)</div>
                        <div style={ui.itemVal}>
                          <b>{money(owed)}원</b>
                        </div>
                      </div>
                      <div style={ui.itemRow}>
                        <div style={ui.itemKey}>선결제</div>
                        <div style={ui.itemVal}>{money(paid)}원</div>
                      </div>
                      <div style={ui.itemRow}>
                        <div style={ui.itemKey}>{delta > 0 ? "입금 필요" : delta < 0 ? "환급 예정" : "0원"}</div>
                        <div style={ui.itemVal}>
                          <b>{money(Math.abs(delta))}원</b>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div style={ui.footer}>카톡 템플릿: 벙주 블록 제외 / 총액=차수합</div>
    </div>
  );
}

const ui = {
  page: {
    minHeight: "100vh",
    padding: 14,
    background: "#0b0b0d",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    background: "#141418",
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.07)",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  header: { padding: "6px 2px 2px 2px" },
  h1: { fontSize: 22, margin: 0, fontWeight: 900, letterSpacing: -0.2 },
  sub: { opacity: 0.78, marginTop: 6, fontSize: 13 },

  section: { marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" },
  sectionTitle: { fontWeight: 900, fontSize: 14, marginBottom: 8 },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  field: { width: "100%", minWidth: 0 },

  label: { fontSize: 12, opacity: 0.78, marginTop: 2 },
  helper: { fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.4 },

  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    padding: "12px 12px",
    background: "#0c0c10",
    color: "white",
    border: "1px solid rgba(255,255,255,0.16)",
    outline: "none",
    marginTop: 6,
    fontSize: 14,
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    padding: "12px 52px 12px 12px",
    backgroundColor: "#0c0c10",
    backgroundImage: CHEVRON_BG,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "16px 16px",
    color: "white",
    border: "1px solid rgba(255,255,255,0.16)",
    outline: "none",
    marginTop: 6,
    fontSize: 14,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    background: "#0c0c10",
    color: "white",
    border: "1px solid rgba(255,255,255,0.16)",
    outline: "none",
    resize: "vertical",
    fontSize: 14,
    lineHeight: 1.4,
  },

  warnText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 900,
    color: "#ff4d4f",
  },

  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    fontSize: 12,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  toggle: { display: "flex", gap: 10, alignItems: "center", fontSize: 13, opacity: 0.95, marginTop: 10 },

  list: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    background: "#101016",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    minWidth: 0,
  },
  listName: { fontWeight: 900, display: "flex", gap: 8, alignItems: "center", minWidth: 0 },

  badge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    background: "rgba(124,58,237,0.25)",
    border: "1px solid rgba(124,58,237,0.5)",
  },

  smallSelect: {
    boxSizing: "border-box",
    borderRadius: 12,
    padding: "10px 52px 10px 12px",
    backgroundColor: "#0c0c10",
    backgroundImage: CHEVRON_BG,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "16px 16px",
    color: "white",
    border: "1px solid rgba(255,255,255,0.16)",
    outline: "none",
    fontSize: 14,
    minWidth: 104,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },

  roundCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    background: "#101016",
    border: "1px solid rgba(255,255,255,0.08)",
    position: "relative",
  },
  roundHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 46,
  },
  roundTitle: { fontWeight: 900, fontSize: 14 },

  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(12,12,16,0.9)",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    lineHeight: 1,
  },

  roundTools: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },

  inlineBtns: { display: "flex", gap: 8 },
  tinyBtn: {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  },

  checkGrid: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    width: "100%",
    minWidth: 0,
  },
  checkItem: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 13,
    minWidth: 0,
  },

  btnRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },

  primaryBtn: {
    width: "100%",
    marginTop: 10,
    padding: "14px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 14,
  },
  secondaryBtn: {
    width: "100%",
    marginTop: 10,
    padding: "14px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#0c0c10",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 14,
  },

  resultBox: {
    padding: 12,
    borderRadius: 16,
    background: "#0f0f13",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  totalLine: { fontSize: 15, fontWeight: 900 },

  personList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 },
  personCard: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  personHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  personName: { fontWeight: 900, display: "flex", gap: 8, alignItems: "center" },
  personTotal: { fontWeight: 900 },
  personItems: { marginTop: 10, display: "flex", flexDirection: "column", gap: 8 },
  itemRow: { display: "flex", justifyContent: "space-between", opacity: 0.95 },
  itemKey: { fontSize: 12, opacity: 0.8 },
  itemVal: { fontSize: 12, fontWeight: 900 },
  hr: { height: 1, background: "rgba(255,255,255,0.10)", margin: "10px 0" },

  footer: { opacity: 0.6, fontSize: 12, marginTop: 10 },
};