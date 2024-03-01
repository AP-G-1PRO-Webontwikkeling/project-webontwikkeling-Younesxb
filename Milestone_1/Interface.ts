

export interface Club {
    name: string;
    league: string;
  }
  
  export interface Player {
    id: string;
    name: string;
    age: number;
    position: string;
    nationality: string;
    overallRating: number;
    isActive: boolean;
    birthDate: string;
    club: Club;
    imageURL: string;
  }
  