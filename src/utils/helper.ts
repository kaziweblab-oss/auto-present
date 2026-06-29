import { googleLogout } from "@react-oauth/google";

import type {
  loadAllRollsParams,
  RollInputParams,
  SubmitAttendanceParams,
} from "../types/types";
import Swal from "sweetalert2";

import axiosInstance from "../api/axiousInstance";

export const handelSignUpBtn = (navigate: any) => {
  navigate("/sign-up");
};

export const handelLogOutBtn = (navigate: any) => {
  googleLogout();
  localStorage.clear();
  navigate("/");
};

export const fetchGoogleUserData = async (accessToken: string) => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );
    const googleUser = await res.json();

    return {
      googleUser,
    };
  } catch (err) {
    console.log("Error fetching google data : ", err);
    throw err;
  }
};

//login page function

export const extractId = (link: string) => {
  const matches = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
};

// dashboard page functions

export const collectAllRolls = async ({
  selectedSubjectsCode,
  setAllValidRolls,
  setSelectedRolls,
  sheetID,
}: loadAllRollsParams) => {
  if (selectedSubjectsCode.length === 0) {
    setSelectedRolls([]);
    setAllValidRolls([]);
    return;
  }

  try {
    let combinedRolls: string[] = [];
    for (const subject of selectedSubjectsCode) {
      //find exact roll column
      const res = await axiosInstance.get(
        `/${sheetID}/values/${subject}!A1:Z200`,
      );
      const rows = res.data.values || [];

      //find roll row index
      const rollRowIndex = rows.findIndex((row: any[]) =>
        row.some((cell) => cell?.toString().toLowerCase().includes("roll")),
      );

      if (rollRowIndex !== -1) {
        const headerRow = rows[rollRowIndex];

        //find oll column
        const rollColumnIndex = headerRow.findIndex((cell: any) =>
          cell?.toString().toLowerCase().includes("roll"),
        );

        //slect row type
        const rolls = rows
          .slice(rollRowIndex + 1)
          .map((row: any) => {
            return Array.isArray(row) && row[rollColumnIndex]
              ? row[rollColumnIndex].toString().trim()
              : "";
          })
          .filter((r: string) => r !== "");
        combinedRolls = [...combinedRolls, ...rolls];
      }
    }

    //find unic roll
    const finalUniqueRolls = [...new Set(combinedRolls)];

    //send massage for error collecting roll
    if (finalUniqueRolls.length === 0) {
      Swal.fire(
        "Data Not Found",
        "সিলেক্ট করা সাবজেক্টের শিটে কোনো রোল নম্বর খুঁজে পাওয়া যায়নি! দয়া করে শিটের হেডার চেক করুন।",
        "error",
      );
      setAllValidRolls([]);
      setSelectedRolls([]);
      return;
    }

    //successful
    setAllValidRolls(finalUniqueRolls);
  } catch (err: any) {
    // 🌟 এপিআই বা নেটওয়ার্কের কোনো এরর হলে ইউজারকে পপ-আপ দেখানো হবে
    Swal.fire(
      "Error",
      err.message ||
        "গুগল শিট থেকে রোল নম্বর লোড করতে সমস্যা হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন বা শিটের পারমিশন চেক করুন।",
      "error",
    );
  }
};

export const handelRollInput = ({
  e,
  inputRoll,
  selectedSubjectsCode,
  allValidRolls,
  selectedRolls,
  setSelectedRolls,
  setInputRoll,
}: RollInputParams) => {
  if (e.key === "Enter" || e.key === "") {
    e.preventDefault();

    const roll = inputRoll.trim();
    if (!roll) return;

    if (selectedSubjectsCode.length === 0) {
      Swal.fire(
        "Warning",
        "দয়া করে আগে একটি বা একাধিক সাবজেক্ট সিলেক্ট করুন!",
        "warning",
      );
      setInputRoll("");
      return;
    }

    if (!allValidRolls.includes(roll)) {
      Swal.fire("Error", "এই রোলটি শিটে নেই!", "error");
      setInputRoll("");
      return;
    }

    if (selectedRolls.includes(roll)) {
      Swal.fire("Info", "এই রোলটি আগেই যোগ করা হয়েছে!", "info");
      setInputRoll("");
      return;
    }

    setSelectedRolls((prev) => [...prev, roll]);
    setInputRoll("");
  }
};

export const processAttendanceSubmit = async ({
  e,
  sheetID,
  selectedSubjects,
  attendanceDate,
  selectedRolls,
  setSubmitting,
  setSelectedRolls,
  setInputRoll,
  setAttendanceDate,
  setSelectedSubjectCodes,
}: SubmitAttendanceParams) => {
  e.preventDefault();

  if (selectedSubjects.length === 0) {
    Swal.fire("Error", "Please Select a Subject.", "error");
    return;
  } else if (!attendanceDate) {
    Swal.fire("Error", "Please Input Attendence Date.", "error");
    return;
  } else if (selectedRolls.length === 0) {
    Swal.fire("Error", "Please Selecte Minimam a Roll.", "error");
    return;
  }

  setSubmitting(true);
  const [year, month, day] = attendanceDate.split("-");
  const formattedDate = `${day}/${month}/${year}`;

  try {
    for (const subject of selectedSubjects) {
      //collecting data from sheet
      const res = await axiosInstance.get(
        `/${sheetID}/values/${subject}!A1:Z200`,
      );

      const rows = res.data.values || [];
      const headerRowIndex = rows.findIndex((row: any[]) =>
        row.some((cell) => cell?.toString().toLowerCase().includes("roll")),
      );

      if (headerRowIndex === -1) {
        throw new Error(`${subject}  শিটে "Roll" কলামটি খুঁজে পাওয়া যায়নি!`);
      }

      const headerRow = rows[headerRowIndex];
      const rollColumnIndex = headerRow.findIndex((cell: any) =>
        cell?.toString().toLowerCase().includes("roll"),
      );

      if (headerRow.includes(formattedDate)) {
        throw new Error(
          `${subject} এর জন্য এই তারিখে আগেই অ্যাটেনডেন্স নেওয়া হয়েছে!`,
        );
      }

      const targetColumnIndex = headerRow.length;
      const getColumnLetter = (index: number): string => {
        let letter = "";
        let tempIndex = index;
        while (tempIndex >= 0) {
          letter = String.fromCharCode((tempIndex % 26) + 65) + letter;
          tempIndex = Math.floor(tempIndex / 26) - 1;
        }
        return letter;
      };

      const targetColumnLetter = getColumnLetter(targetColumnIndex);

      //push Date
      await axiosInstance.put(
        `/${sheetID}/values/${subject}!${targetColumnLetter}${headerRowIndex + 1}?valueInputOption=USER_ENTERED`,
        { values: [[formattedDate]] },
      );

      //update roll data
      const startRow = headerRowIndex + 2;
      const updateValues = [];

      //check all row
      for (let i = startRow; i <= rows.length; i++) {
        const row = rows[i - 1];
        const sheetRoll =
          row && row[rollColumnIndex]
            ? row[rollColumnIndex].toString().trim()
            : "";

        //push present Value
        if (sheetRoll !== "") {
          updateValues.push([selectedRolls.includes(sheetRoll) ? "P" : "A"]);
        } else {
          updateValues.push([""]);
        }
      }

      //push update to sheet
      await axiosInstance.put(
        `/${sheetID}/values/${subject}!${targetColumnLetter}${startRow}:${targetColumnLetter}${startRow + updateValues.length - 1}?valueInputOption=USER_ENTERED`,
        { values: updateValues },
      );
    }

    Swal.fire(
      "Success",
      "সবগুলো সাবজেক্টের অ্যাটেনডেন্স সফলভাবে আপডেট হয়েছে!",
      "success",
    );
    setSelectedRolls([]);
    setInputRoll("");
    setAttendanceDate("");
    setSelectedSubjectCodes([]);
  } catch (err: any) {
    Swal.fire("Error", err.message || "শিট আপডেট করতে সমস্যা হয়েছে।", "error");
  } finally {
    setSubmitting(false);
  }
};
